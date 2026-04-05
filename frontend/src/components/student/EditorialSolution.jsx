import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiTimeLine, RiCheckLine, RiErrorWarningLine, RiBookOpenLine,
  RiThumbsUpLine, RiShareForwardLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';

export default function EditorialSolution({ problemId, solution, isOpen, onClose, mode = 'practice' }) {
  const [likedSolution, setLikedSolution] = useState(false);

  if (!solution) return null;

  const handleLikeSolution = () => {
    setLikedSolution(!likedSolution);
    toast.success(likedSolution ? 'Removed like' : 'Liked this solution!');
  };

  const handleShareSolution = () => {
    const shareText = `Check out this editorial solution for "${solution.problem_name}" on Swarnandrian`;
    if (navigator.share) {
      navigator.share({
        title: 'Editorial Solution',
        text: shareText,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto bg-white rounded-t-3xl lg:rounded-2xl lg:absolute lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-2xl"
          >
            <div className="p-6 lg:p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <RiBookOpenLine className="w-6 h-6 text-blue-600" /> Editorial Solution
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {mode === 'practice' ? '💡 Learn from the official solution' : '📖 Reference solution'}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              {/* Problem Reference */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Problem:</span> {solution.problem_name}
                </p>
              </div>

              {/* Solution Overview */}
              <div className="space-y-6">
                {/* Approach */}
                {solution.approach && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      🎯 Approach
                    </h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {solution.approach}
                    </p>
                  </div>
                )}

                {/* Complexity Analysis */}
                {(solution.time_complexity || solution.space_complexity) && (
                  <div className="grid grid-cols-2 gap-4">
                    {solution.time_complexity && (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                          Time Complexity
                        </p>
                        <p className="text-lg font-bold text-emerald-900 mt-2 font-mono">
                          {solution.time_complexity}
                        </p>
                        {solution.time_explanation && (
                          <p className="text-xs text-emerald-700 mt-2">
                            {solution.time_explanation}
                          </p>
                        )}
                      </div>
                    )}
                    {solution.space_complexity && (
                      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                          Space Complexity
                        </p>
                        <p className="text-lg font-bold text-purple-900 mt-2 font-mono">
                          {solution.space_complexity}
                        </p>
                        {solution.space_explanation && (
                          <p className="text-xs text-purple-700 mt-2">
                            {solution.space_explanation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Key Points */}
                {solution.key_points && solution.key_points.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      ⭐ Key Points
                    </h3>
                    <ul className="space-y-2">
                      {solution.key_points.map((point, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="text-blue-600 font-bold mt-0.5">•</span>
                          <span className="text-gray-700">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Code Solution */}
                {solution.code && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      💻 Code Solution
                    </h3>
                    <div className="bg-gray-900 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                        <span className="text-xs font-semibold text-gray-400 uppercase">
                          {solution.language || 'Python'}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(solution.code);
                            toast.success('Code copied!');
                          }}
                          className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                        >
                          Copy
                        </button>
                      </div>
                      <pre className="p-4 text-gray-100 text-sm overflow-x-auto">
                        <code>{solution.code}</code>
                      </pre>
                    </div>
                  </div>
                )}

                {/* Related Concepts */}
                {solution.related_topics && solution.related_topics.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">
                      🔗 Related Concepts
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {solution.related_topics.map((topic, i) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tips & Tricks */}
                {solution.tips && solution.tips.length > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                      💡 Pro Tips
                    </h3>
                    <ul className="text-sm text-amber-800 space-y-1">
                      {solution.tips.map((tip, i) => (
                        <li key={i}>• {tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Mistakes to Avoid */}
                {solution.common_mistakes && solution.common_mistakes.length > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                      <RiErrorWarningLine className="w-4 h-4" /> Common Mistakes
                    </h3>
                    <ul className="text-sm text-red-800 space-y-1">
                      {solution.common_mistakes.map((mistake, i) => (
                        <li key={i}>• {mistake}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Similar Problems */}
                {solution.similar_problems && solution.similar_problems.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">
                      🎯 Similar Problems
                    </h3>
                    <div className="space-y-2">
                      {solution.similar_problems.map((problem, i) => (
                        <a
                          key={i}
                          href={`/problem/${problem.id}`}
                          className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <p className="font-medium text-gray-900">{problem.name}</p>
                          <p className="text-xs text-gray-500">
                            {problem.difficulty} • {problem.topic}
                          </p>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between gap-3">
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLikeSolution}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      likedSolution
                        ? 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <RiThumbsUpLine className="w-4 h-4" /> Like
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleShareSolution}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                  >
                    <RiShareForwardLine className="w-4 h-4" /> Share
                  </motion.button>
                </div>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all"
                >
                  Got it!
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
