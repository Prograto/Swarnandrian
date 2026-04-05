import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import {
  RiChat3Line, RiThumbsUpLine, RiThumbsDownLine, RiReply2Line,
  RiProgress3Line, RiCheckLine, RiSendPlaneFill,
} from 'react-icons/ri';
import { useAuthStore } from '../../store/authStore';

export default function DiscussionSection({ problemId, problemTitle }) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [newQuestion, setNewQuestion] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // recent, helpful, trending

  // Fetch discussions
  const { data: discussions = [], isLoading } = useQuery(
    ['problem-discussions', problemId, sortBy],
    () =>
      api.get(`/problems/${problemId}/discussions`, { params: { sort: sortBy } })
        .then((r) => r.data || []),
    { staleTime: 30000 }
  );

  // Post question mutation
  const postQuestionMutation = useMutation(
    (questionText) =>
      api.post(`/problems/${problemId}/discussions`, {
        title: questionText.split('\n')[0].substring(0, 100),
        content: questionText,
      }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['problem-discussions', problemId]);
        setNewQuestion('');
        toast.success('Question posted successfully!');
      },
      onError: () => {
        toast.error('Failed to post question');
      },
    }
  );

  // Post reply mutation
  const postReplyMutation = useMutation(
    ({ discussionId, replyText }) =>
      api.post(`/discussions/${discussionId}/replies`, { content: replyText }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['problem-discussions', problemId]);
        setReplyText('');
        setReplyingTo(null);
        toast.success('Reply posted!');
      },
      onError: () => {
        toast.error('Failed to post reply');
      },
    }
  );

  // Vote mutation
  const voteMutation = useMutation(
    ({ discussionId, replyId, voteType }) =>
      api.post(`/discussions/${discussionId}/vote`, {
        reply_id: replyId,
        vote_type: voteType, // upvote, downvote
      }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['problem-discussions', problemId]);
      },
      onError: () => {
        toast.error('Failed to record vote');
      },
    }
  );

  const handlePostQuestion = () => {
    if (!newQuestion.trim()) {
      toast.error('Please enter a question');
      return;
    }
    postQuestionMutation.mutate(newQuestion);
  };

  const handlePostReply = (discussionId) => {
    if (!replyText.trim()) {
      toast.error('Please enter a reply');
      return;
    }
    postReplyMutation.mutate({ discussionId, replyText });
  };

  const DiscussionCard = ({ discussion }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-all"
    >
      {/* Question Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold shrink-0">
          {discussion.author?.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">
            {discussion.author?.name || 'Anonymous'}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(discussion.created_at).toLocaleDateString()} ·{' '}
            {discussion.replies?.length || 0} replies
          </p>
        </div>
        {discussion.is_marked_correct && (
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            <RiCheckLine className="w-3 h-3" /> Answered
          </span>
        )}
      </div>

      {/* Question Content */}
      <div className="mb-4 pl-13">
        <h3 className="font-bold text-gray-900 mb-2">{discussion.title}</h3>
        <p className="text-gray-700 text-sm leading-relaxed">
          {discussion.content}
        </p>

        {/* Tags */}
        {discussion.tags && discussion.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {discussion.tags.map((tag, i) => (
              <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Voting & Actions */}
      <div className="flex items-center gap-4 mb-4 pl-13 pb-4 border-b border-gray-100">
        <motion.button
          whileHover={{ scale: 1.1 }}
          onClick={() =>
            voteMutation.mutate({
              discussionId: discussion.id,
              replyId: null,
              voteType: 'upvote',
            })
          }
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-600 transition-colors"
        >
          <RiThumbsUpLine className="w-4 h-4" /> {discussion.upvotes || 0}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          onClick={() =>
            voteMutation.mutate({
              discussionId: discussion.id,
              replyId: null,
              voteType: 'downvote',
            })
          }
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors"
        >
          <RiThumbsDownLine className="w-4 h-4" /> {discussion.downvotes || 0}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={() => setReplyingTo(replyingTo === discussion.id ? null : discussion.id)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors"
        >
          <RiReply2Line className="w-4 h-4" /> Reply
        </motion.button>
      </div>

      {/* Replies */}
      {discussion.replies && discussion.replies.length > 0 && (
        <div className="space-y-3 mb-4 pl-13">
          <p className="text-xs font-semibold text-gray-500 uppercase">
            {discussion.replies.length} {discussion.replies.length === 1 ? 'Reply' : 'Replies'}
          </p>
          {discussion.replies.map((reply, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-start gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-bold shrink-0">
                  {reply.author?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800">
                    {reply.author?.name || 'Anonymous'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(reply.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-2">{reply.content}</p>
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() =>
                    voteMutation.mutate({
                      discussionId: discussion.id,
                      replyId: reply.id,
                      voteType: 'upvote',
                    })
                  }
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-600 transition-colors"
                >
                  <RiThumbsUpLine className="w-3 h-3" /> {reply.upvotes || 0}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() =>
                    voteMutation.mutate({
                      discussionId: discussion.id,
                      replyId: reply.id,
                      voteType: 'downvote',
                    })
                  }
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors"
                >
                  <RiThumbsDownLine className="w-3 h-3" /> {reply.downvotes || 0}
                </motion.button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply Input */}
      {replyingTo === discussion.id && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 pl-13 border-t border-gray-100 pt-4"
        >
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write your reply..."
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none text-sm"
            rows="3"
          />
          <div className="flex gap-2 mt-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePostReply(discussion.id)}
              disabled={postReplyMutation.isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all disabled:opacity-50"
            >
              <RiSendPlaneFill className="w-4 h-4" /> Post Reply
            </motion.button>
            <button
              onClick={() => setReplyingTo(null)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
          <RiChat3Line className="w-6 h-6 text-blue-600" /> Discussions
        </h2>
        <p className="text-sm text-gray-600">
          Ask questions and share insights about "{problemTitle}"
        </p>
      </div>

      {/* Post Question */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-200">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Ask a question
        </label>
        <textarea
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          placeholder="What's confusing about this problem? Share your question..."
          className="w-full px-4 py-3 border border-blue-300 bg-white rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 resize-none text-sm"
          rows="3"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handlePostQuestion}
          disabled={postQuestionMutation.isLoading}
          className="mt-3 flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all disabled:opacity-50"
        >
          <RiSendPlaneFill className="w-4 h-4" /> Post Question
        </motion.button>
      </div>

      {/* Sort Options */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">
          {discussions.length} Discussions
        </p>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="recent">Recent</option>
          <option value="helpful">Most Helpful</option>
          <option value="trending">Trending</option>
        </select>
      </div>

      {/* Discussions List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RiProgress3Line className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
            <p className="text-gray-600 text-sm">Loading discussions...</p>
          </div>
        </div>
      ) : discussions.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-center">
          <div>
            <RiChat3Line className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No discussions yet</p>
            <p className="text-sm text-gray-400 mt-1">Be the first to ask a question!</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {discussions.map((discussion) => (
              <DiscussionCard key={discussion.id} discussion={discussion} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
