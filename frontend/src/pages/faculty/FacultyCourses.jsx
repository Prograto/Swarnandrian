import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import DashboardLayout from '../../components/common/DashboardLayout';
import { FACULTY_NAV } from './FacultyDashboard';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import VideoLibraryRoundedIcon from '@mui/icons-material/VideoLibraryRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import PublishRoundedIcon from '@mui/icons-material/PublishRounded';
import UnpublishedRoundedIcon from '@mui/icons-material/UnpublishedRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import { Link, useNavigate } from 'react-router-dom';
import RichTextEditor from '../../components/ui/RichTextEditor';

const SECTION_TYPES = [
  { value: 'aptitude', label: 'Aptitude', icon: PsychologyRoundedIcon, color: 'text-pink-600 bg-pink-50' },
  { value: 'coding', label: 'Coding', icon: CodeRoundedIcon, color: 'text-[#4F7CF3] bg-blue-50' },
  { value: 'technical', label: 'Technical', icon: SettingsRoundedIcon, color: 'text-emerald-600 bg-emerald-50' },
];

const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];

function Modal({ title, onClose, children, wide }) {
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        data-lenis-prevent
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto overscroll-contain"
        onClick={onClose}>
        <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
          onClick={e => e.stopPropagation()}
          className={`bg-surface-card rounded-3xl border border-theme shadow-[0_32px_80px_rgba(15,23,42,0.2)] w-full overflow-hidden ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-theme">
            <h3 className="font-bold text-primary">{title}</h3>
            <button onClick={onClose} className="btn-ghost btn-sm p-1.5"><CloseRoundedIcon sx={{ fontSize: 18 }} /></button>
          </div>
          <div data-lenis-prevent-wheel data-lenis-prevent-touch className="p-6 max-h-[70vh] overflow-y-auto overscroll-contain">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-secondary mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function getEmptyBlogForm() {
  return {
    title: '',
    content: '',
    summary: '',
    video_url: '',
    image_url: '',
    tags: '',
    estimated_read_time: 5,
  };
}

export default function FacultyCourses() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [sectionType, setSectionType] = useState('aptitude');
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState(null);
  const [expandedTopics, setExpandedTopics] = useState({});
  const [expandedBlogPanels, setExpandedBlogPanels] = useState({});
  const [blogsBySubtopic, setBlogsBySubtopic] = useState({});
  const [blogsLoading, setBlogsLoading] = useState({});
  const [editingBlog, setEditingBlog] = useState(null);

  const [courseForm, setCourseForm] = useState({ title: '', description: '', section_type: 'aptitude', thumbnail_url: '', difficulty: 'Beginner', tags: '', is_published: false });
  const [topicForm, setTopicForm] = useState({ title: '', description: '', order: 0 });
  const [blogForm, setBlogForm] = useState(getEmptyBlogForm());
  const [uploading, setUploading] = useState(false);
  const [blogUploading, setBlogUploading] = useState(null);

  const { data: coursesData, isLoading } = useQuery(
    ['faculty-courses', sectionType],
    () => api.get('/courses', { params: { section_type: sectionType, limit: 50 } }).then(r => r.data)
  );
  const courses = coursesData?.items || [];

  const { data: courseDetail } = useQuery(
    ['course-detail', selectedCourse],
    () => api.get(`/courses/${selectedCourse}`).then(r => r.data),
    { enabled: !!selectedCourse }
  );

  const uploadAsset = async (file, folder = 'course-images') => {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post(`/upload/?folder=${folder}`, fd);
    return data.url;
  };

  const resetBlogForm = () => setBlogForm(getEmptyBlogForm());

  const openBlogEditor = ({ courseId, topicId, subtopicId, blogId = '', newBlog = false }) => {
    const params = new URLSearchParams();
    params.set('section_type', sectionType);
    if (courseId) params.set('courseId', courseId);
    if (topicId) params.set('topicId', topicId);
    if (subtopicId) params.set('subtopicId', subtopicId);
    if (blogId) params.set('blogId', blogId);
    if (newBlog) params.set('newBlog', '1');
    navigate(`/faculty/blogs?${params.toString()}`);
  };

  const refreshSubtopicBlogs = async (topicId, subtopicId, force = false) => {
    if (!force && blogsBySubtopic[subtopicId]) return blogsBySubtopic[subtopicId];
    setBlogsLoading((prev) => ({ ...prev, [subtopicId]: true }));
    try {
      const { data } = await api.get(`/courses/${selectedCourse}/topics/${topicId}/subtopics/${subtopicId}/blogs`);
      const items = Array.isArray(data) ? data : [];
      setBlogsBySubtopic((prev) => ({ ...prev, [subtopicId]: items }));
      return items;
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to load blogs');
      return [];
    } finally {
      setBlogsLoading((prev) => ({ ...prev, [subtopicId]: false }));
    }
  };

  const openBlogPanel = async (topic, subtopic) => {
    setExpandedBlogPanels((prev) => ({ ...prev, [subtopic.id]: true }));
    setSelectedTopic(topic);
    setSelectedSubtopic(subtopic);
    await refreshSubtopicBlogs(topic.id, subtopic.id);
  };

  const closeBlogPanel = (subtopicId) => {
    setExpandedBlogPanels((prev) => ({ ...prev, [subtopicId]: false }));
  };

  const openCreateBlog = (topic, subtopic = null) => {
    openBlogEditor({
      courseId: selectedCourse,
      topicId: topic.id,
      subtopicId: subtopic?.id,
      newBlog: !subtopic,
    });
  };

  const openEditBlog = (blog, topic, subtopic) => {
    openBlogEditor({ courseId: selectedCourse, topicId: topic.id, subtopicId: subtopic.id, blogId: blog.id });
  };

  const createCourse = useMutation(
    () => api.post('/courses', { ...courseForm, tags: courseForm.tags.split(',').map(t => t.trim()).filter(Boolean) }),
    { onSuccess: () => { qc.invalidateQueries(['faculty-courses', sectionType]); setShowCourseModal(false); toast.success('Course created!'); } }
  );
  const updateCourse = useMutation(
    () => api.put(`/courses/${editingCourse.id}`, { ...courseForm, tags: courseForm.tags.split(',').map(t => t.trim()).filter(Boolean) }),
    { onSuccess: () => { qc.invalidateQueries(['faculty-courses', sectionType]); qc.invalidateQueries(['course-detail', selectedCourse]); setShowCourseModal(false); toast.success('Course updated!'); } }
  );
  const deleteCourse = useMutation(
    (id) => api.delete(`/courses/${id}`),
    { onSuccess: () => { qc.invalidateQueries(['faculty-courses', sectionType]); if (selectedCourse === editingCourse?.id) setSelectedCourse(null); toast.success('Course deleted'); } }
  );
  const createTopic = useMutation(
    () => api.post(`/courses/${selectedCourse}/topics`, topicForm),
    { onSuccess: () => { qc.invalidateQueries(['course-detail', selectedCourse]); setShowTopicModal(false); setTopicForm({ title: '', description: '', order: 0 }); toast.success('Topic added!'); } }
  );
  const deleteTopic = useMutation(
    ({ courseId, topicId }) => api.delete(`/courses/${courseId}/topics/${topicId}`),
    { onSuccess: () => { qc.invalidateQueries(['course-detail', selectedCourse]); toast.success('Topic deleted'); } }
  );
  const saveBlog = useMutation(
    ({ blogId, topicId, subtopicId, payload }) => (
      blogId
        ? api.put(`/courses/blogs/${blogId}`, payload)
        : api.post(`/courses/${selectedCourse}/topics/${topicId}/subtopics/${subtopicId}/blogs`, payload)
    ),
    {
      onSuccess: async (_, variables) => {
        qc.invalidateQueries(['course-detail', selectedCourse]);
        if (variables?.topicId && variables?.subtopicId) {
          await refreshSubtopicBlogs(variables.topicId, variables.subtopicId, true);
        }
        setShowBlogModal(false);
        setEditingBlog(null);
        resetBlogForm();
        toast.success(variables?.blogId ? 'Blog updated!' : 'Blog published!');
      },
    }
  );
  const deleteBlog = useMutation(
    ({ blogId }) => api.delete(`/courses/blogs/${blogId}`),
    {
      onSuccess: async (_, variables) => {
        qc.invalidateQueries(['course-detail', selectedCourse]);
        if (variables?.topicId && variables?.subtopicId) {
          await refreshSubtopicBlogs(variables.topicId, variables.subtopicId, true);
        }
        toast.success('Blog deleted');
      },
    }
  );

  const openCreateCourse = () => {
    setEditingCourse(null);
    setCourseForm({ title: '', description: '', section_type: sectionType, thumbnail_url: '', difficulty: 'Beginner', tags: '', is_published: false });
    setShowCourseModal(true);
  };
  const openEditCourse = (c) => {
    setEditingCourse(c);
    setCourseForm({ title: c.title, description: c.description, section_type: c.section_type, thumbnail_url: c.thumbnail_url || '', difficulty: c.difficulty || 'Beginner', tags: (c.tags || []).join(', '), is_published: c.is_published || false });
    setShowCourseModal(true);
  };

  const currentDetail = courseDetail;

  return (
    <DashboardLayout navItems={FACULTY_NAV} role="faculty">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="page-title flex items-center gap-2"><SchoolRoundedIcon sx={{ fontSize: 26 }} className="text-[#4F7CF3]" /> Courses</h1>
            <p className="text-sm text-secondary mt-0.5">Create GFG-style courses with topics and blogs, plus videos and tests</p>
          </div>
          <button onClick={openCreateCourse} className="btn-primary flex items-center gap-2 text-sm self-start">
            <AddRoundedIcon sx={{ fontSize: 18 }} /> New Course
          </button>
          <Link to={`/faculty/blogs?section_type=${sectionType}`} className="btn-secondary flex items-center gap-2 text-sm self-start">
            <ArticleRoundedIcon sx={{ fontSize: 18 }} /> Blog Editor
          </Link>
        </div>

        {/* Section type tabs */}
        <div className="flex gap-2 flex-wrap">
          {SECTION_TYPES.map(s => (
            <button key={s.value} onClick={() => { setSectionType(s.value); setSelectedCourse(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${sectionType === s.value ? 'border-[#4F7CF3] text-white' : 'border-theme bg-surface-card text-secondary hover:border-[#4F7CF3] hover:text-[#4F7CF3]'}`}
              style={sectionType === s.value ? { background: 'linear-gradient(135deg,#4F7CF3,#7C8CFF)' } : {}}>
              <s.icon sx={{ fontSize: 16 }} /> {s.label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-6">
          {/* Course list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-secondary">{courses.length} Course{courses.length !== 1 ? 's' : ''}</p>
            </div>
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
            ) : courses.length === 0 ? (
              <div className="card p-8 text-center">
                <MenuBookRoundedIcon sx={{ fontSize: 36 }} className="text-muted mx-auto mb-2" />
                <p className="text-secondary text-sm">No courses yet</p>
                <button onClick={openCreateCourse} className="btn-primary btn-sm mt-3">Create First Course</button>
              </div>
            ) : (
              <div data-lenis-prevent-wheel data-lenis-prevent-touch className="space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto overscroll-contain pr-1">
                {courses.map(c => (
                  <button key={c.id} onClick={() => setSelectedCourse(c.id)}
                    className={`w-full text-left rounded-2xl border p-3.5 transition-all ${selectedCourse === c.id ? 'border-[#4F7CF3] bg-blue-50/40 dark:bg-blue-900/10' : 'border-theme bg-surface-card hover:border-[rgba(79,124,243,0.3)]'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-primary truncate">{c.title}</p>
                        <p className="text-xs text-secondary mt-0.5 truncate">{c.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="badge badge-primary text-xs">{c.topic_count || 0} topics</span>
                          <span className={`badge text-xs ${c.is_published ? 'badge-mint' : 'badge-medium'}`}>{c.is_published ? 'Published' : 'Draft'}</span>
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); openEditCourse(c); }} className="btn-ghost btn-xs p-1 flex-shrink-0">
                        <EditRoundedIcon sx={{ fontSize: 14 }} />
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Course detail / editor */}
          <div>
            {!selectedCourse ? (
              <div className="card p-16 text-center">
                <SchoolRoundedIcon sx={{ fontSize: 48 }} className="text-muted mx-auto mb-3" />
                <p className="text-secondary">Select a course to manage its content</p>
              </div>
            ) : !currentDetail ? (
              <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
            ) : (
              <div className="space-y-4">
                {/* Course header */}
                <div className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-primary">{currentDetail.title}</h2>
                      <p className="text-sm text-secondary mt-1">{currentDetail.description}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {(currentDetail.tags || []).map(t => <span key={t} className="badge badge-primary text-xs">{t}</span>)}
                        <span className="badge badge-medium">{currentDetail.difficulty}</span>
                        <span className={`badge ${currentDetail.is_published ? 'badge-mint' : 'badge-medium'}`}>{currentDetail.is_published ? 'Published' : 'Draft'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => openEditCourse(currentDetail)} className="btn-secondary btn-sm flex items-center gap-1.5">
                        <EditRoundedIcon sx={{ fontSize: 14 }} /> Edit
                      </button>
                      <button onClick={() => { if(window.confirm('Delete this course?')) deleteCourse.mutate(currentDetail.id); }} className="btn-danger btn-sm flex items-center gap-1.5">
                        <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} /> Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Topics */}
                <div className="card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-primary">Topics ({currentDetail.topics?.length || 0})</h3>
                    <button onClick={() => setShowTopicModal(true)} className="btn-primary btn-sm flex items-center gap-1.5">
                      <AddRoundedIcon sx={{ fontSize: 14 }} /> Add Topic
                    </button>
                  </div>

                  {(currentDetail.topics || []).length === 0 ? (
                    <p className="text-sm text-secondary text-center py-4">No topics yet. Add your first topic!</p>
                  ) : (
                    <div className="space-y-2">
                      {currentDetail.topics.map((topic, ti) => (
                        <div key={topic.id} className="rounded-2xl border border-theme overflow-hidden">
                          {/* Topic header */}
                          <div className="flex items-center gap-3 px-4 py-3 bg-surface-lighter">
                            <button onClick={() => setExpandedTopics(p => ({ ...p, [topic.id]: !p[topic.id] }))}
                              className="flex items-center gap-2 flex-1 min-w-0 text-left">
                              <motion.span animate={{ rotate: expandedTopics[topic.id] ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                <ExpandMoreRoundedIcon sx={{ fontSize: 18 }} className="text-secondary" />
                              </motion.span>
                              <span className="w-5 h-5 rounded-full bg-[#4F7CF3] text-white text-xs flex items-center justify-center font-bold flex-shrink-0">{ti + 1}</span>
                              <span className="font-semibold text-sm text-primary truncate">{topic.title}</span>
                              <span className="badge badge-primary text-xs flex-shrink-0">{topic.subtopics?.length || 0} blog sections</span>
                            </button>
                            <div className="flex gap-1.5 flex-shrink-0">
                              <button onClick={() => openCreateBlog(topic)} className="btn-primary btn-xs flex items-center gap-1">
                                <AddRoundedIcon sx={{ fontSize: 12 }} /> Add Blog
                              </button>
                              <button onClick={() => deleteTopic.mutate({ courseId: selectedCourse, topicId: topic.id })} className="btn-danger btn-xs p-1">
                                <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
                              </button>
                            </div>
                          </div>

                          {/* Blog sections */}
                          <AnimatePresence>
                            {expandedTopics[topic.id] && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden">
                                <div className="px-4 py-3 space-y-2 bg-surface-card">
                                  {(topic.subtopics || []).length === 0 ? (
                                    <p className="text-xs text-secondary py-2 text-center">No blog sections yet</p>
                                  ) : (
                                    topic.subtopics.map((sub, si) => (
                                      <div key={sub.id} className="space-y-2">
                                        <div className="flex items-center gap-3 rounded-xl border border-theme px-3 py-2.5 bg-surface-lighter">
                                          <span className="text-xs text-secondary w-6 flex-shrink-0">{ti + 1}.{si + 1}</span>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-primary truncate">{sub.title}</p>
                                            <p className="text-xs text-secondary">{sub.blog_count || 0} blog{(sub.blog_count || 0) !== 1 ? 's' : ''}</p>
                                          </div>
                                          <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <button
                                              onClick={() => (expandedBlogPanels[sub.id] ? closeBlogPanel(sub.id) : openBlogPanel(topic, sub))}
                                              className="btn-secondary btn-xs flex items-center gap-1"
                                            >
                                              {expandedBlogPanels[sub.id] ? 'Hide Blogs' : 'Blogs'}
                                            </button>
                                            <button
                                              onClick={() => openCreateBlog(topic, sub)}
                                              className="btn-primary btn-xs flex items-center gap-1"
                                            >
                                              <AddRoundedIcon sx={{ fontSize: 12 }} /> Open Editor
                                            </button>
                                          </div>
                                        </div>

                                        <AnimatePresence>
                                          {expandedBlogPanels[sub.id] && (
                                            <motion.div
                                              initial={{ opacity: 0, y: -6 }}
                                              animate={{ opacity: 1, y: 0 }}
                                              exit={{ opacity: 0, y: -6 }}
                                              className="rounded-2xl border border-theme bg-surface-card p-3"
                                            >
                                              <div className="flex items-center justify-between gap-3 mb-3">
                                                <p className="text-xs font-semibold text-secondary">Blog posts</p>
                                                <button onClick={() => openCreateBlog(topic, sub)} className="btn-primary btn-xs flex items-center gap-1">
                                                  <AddRoundedIcon sx={{ fontSize: 12 }} /> New Blog
                                                </button>
                                              </div>

                                              {blogsLoading[sub.id] ? (
                                                <p className="text-xs text-secondary py-2">Loading blogs...</p>
                                              ) : (blogsBySubtopic[sub.id] || []).length === 0 ? (
                                                <p className="text-xs text-secondary py-2">No blogs yet. Add the first post for this topic.</p>
                                              ) : (
                                                <div className="space-y-2">
                                                  {(blogsBySubtopic[sub.id] || []).map((blog) => (
                                                    <div key={blog.id} className="rounded-xl border border-theme bg-surface-lighter p-3">
                                                      <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0 flex-1">
                                                          <p className="text-sm font-semibold text-primary truncate">{blog.title}</p>
                                                          <p className="text-xs text-secondary line-clamp-2 mt-1">{blog.summary || 'No summary provided.'}</p>
                                                          <div className="flex flex-wrap gap-1.5 mt-2">
                                                            <span className="badge badge-medium text-xs">{blog.estimated_read_time || 5} min</span>
                                                            {blog.video_url && <span className="badge badge-primary text-xs">Video</span>}
                                                            {blog.image_url && <span className="badge badge-mint text-xs">Cover</span>}
                                                          </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                                          <button onClick={() => openEditBlog(blog, topic, sub)} className="btn-secondary btn-xs p-1">
                                                            <EditRoundedIcon sx={{ fontSize: 14 }} />
                                                          </button>
                                                          <button
                                                            onClick={() => {
                                                              if (window.confirm('Delete this blog post?')) {
                                                                deleteBlog.mutate({ blogId: blog.id, topicId: topic.id, subtopicId: sub.id });
                                                              }
                                                            }}
                                                            className="btn-danger btn-xs p-1"
                                                          >
                                                            <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
                                                          </button>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Course Modal */}
      {showCourseModal && (
        <Modal title={editingCourse ? 'Edit Course' : 'Create Course'} onClose={() => setShowCourseModal(false)}>
          <div className="space-y-4">
            <Field label="Course Title">
              <input value={courseForm.title} onChange={e => setCourseForm(p => ({ ...p, title: e.target.value }))} className="input" placeholder="e.g. Complete Aptitude Mastery" />
            </Field>
            <Field label="Description">
              <textarea value={courseForm.description} onChange={e => setCourseForm(p => ({ ...p, description: e.target.value }))} className="input resize-none" rows={3} placeholder="What will students learn?" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Section Type">
                <select value={courseForm.section_type} onChange={e => setCourseForm(p => ({ ...p, section_type: e.target.value }))} className="input">
                  {SECTION_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>
              <Field label="Difficulty">
                <select value={courseForm.difficulty} onChange={e => setCourseForm(p => ({ ...p, difficulty: e.target.value }))} className="input">
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Tags (comma-separated)">
              <input value={courseForm.tags} onChange={e => setCourseForm(p => ({ ...p, tags: e.target.value }))} className="input" placeholder="aptitude, quant, logical" />
            </Field>
            <Field label="Thumbnail URL (optional)">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input value={courseForm.thumbnail_url} onChange={e => setCourseForm(p => ({ ...p, thumbnail_url: e.target.value }))} className="input" placeholder="https://..." />
                  <label className="btn-secondary btn-sm cursor-pointer flex-shrink-0">
                    {uploading ? 'Uploading...' : 'Upload'}
                    <input type="file" accept="image/*" className="hidden" onChange={async e => {
                      if (!e.target.files[0]) return;
                      setUploading(true);
                      try {
                        const url = await uploadAsset(e.target.files[0], 'course-thumbnails');
                        setCourseForm(p => ({ ...p, thumbnail_url: url }));
                        toast.success('Uploaded!');
                      } catch (error) {
                        toast.error(error?.response?.data?.detail || 'Upload failed. You can still paste a thumbnail URL and create the course.');
                      } finally { setUploading(false); }
                    }} />
                  </label>
                </div>
                <p className="text-[11px] text-secondary">
                  Paste a direct image URL or upload an image. If upload fails, leave this empty and create the course; you can add the thumbnail later.
                </p>
                {courseForm.thumbnail_url && (
                  <div className="overflow-hidden rounded-2xl border border-theme bg-surface-lighter">
                    <img src={courseForm.thumbnail_url} alt="Course thumbnail preview" className="h-28 w-full object-cover" loading="lazy" />
                  </div>
                )}
              </div>
            </Field>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={courseForm.is_published} onChange={e => setCourseForm(p => ({ ...p, is_published: e.target.checked }))} className="w-4 h-4 accent-[#4F7CF3]" />
              <div>
                <p className="text-sm font-semibold text-primary">Publish Course</p>
                <p className="text-xs text-secondary">Students can see and access this course</p>
              </div>
            </label>
            <div className="flex gap-3 pt-2">
              <button onClick={() => editingCourse ? updateCourse.mutate() : createCourse.mutate()}
                disabled={!courseForm.title || createCourse.isLoading || updateCourse.isLoading}
                className="btn-primary flex-1 flex items-center justify-center gap-2">
                <SaveRoundedIcon sx={{ fontSize: 16 }} /> {editingCourse ? 'Save Changes' : 'Create Course'}
              </button>
              <button onClick={() => setShowCourseModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Topic Modal */}
      {showTopicModal && (
        <Modal title="Add Topic" onClose={() => setShowTopicModal(false)}>
          <div className="space-y-4">
            <Field label="Topic Title">
              <input value={topicForm.title} onChange={e => setTopicForm(p => ({ ...p, title: e.target.value }))} className="input" placeholder="e.g. Number Series" />
            </Field>
            <Field label="Description (optional)">
              <textarea value={topicForm.description} onChange={e => setTopicForm(p => ({ ...p, description: e.target.value }))} className="input resize-none" rows={2} />
            </Field>
            <Field label="Order">
              <input type="number" value={topicForm.order} onChange={e => setTopicForm(p => ({ ...p, order: parseInt(e.target.value) }))} className="input" min="0" />
            </Field>
            <div className="flex gap-3">
              <button onClick={() => createTopic.mutate()} disabled={!topicForm.title || createTopic.isLoading} className="btn-primary flex-1">Add Topic</button>
              <button onClick={() => setShowTopicModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Blog Modal */}
      {showBlogModal && (
        <Modal title={`${editingBlog ? 'Edit' : 'Create'} Blog in "${selectedSubtopic?.title}"`} onClose={() => { setShowBlogModal(false); setEditingBlog(null); resetBlogForm(); }} wide>
          <div className="space-y-4">
            <Field label="Blog Title *">
              <input value={blogForm.title} onChange={e => setBlogForm(p => ({ ...p, title: e.target.value }))} className="input" placeholder="e.g. Understanding Arithmetic Progressions" />
            </Field>
            <Field label="Summary (shown in listing)">
              <textarea value={blogForm.summary} onChange={e => setBlogForm(p => ({ ...p, summary: e.target.value }))} className="input resize-none" rows={2} placeholder="Brief description..." />
            </Field>
            <Field label="Content *">
              <RichTextEditor
                value={blogForm.content}
                onChange={(content) => setBlogForm((prev) => ({ ...prev, content }))}
                placeholder="Write your blog content here. Use the toolbar for headings, tables, shapes, and rich text formatting..."
              />
              <p className="mt-2 text-[11px] text-secondary">
                You can insert simple text blocks, tables, and formatting directly from the editor toolbar.
              </p>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Video URL or Upload">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <VideoLibraryRoundedIcon sx={{ fontSize: 16 }} className="text-secondary flex-shrink-0" />
                    <input value={blogForm.video_url} onChange={e => setBlogForm(p => ({ ...p, video_url: e.target.value }))} className="input" placeholder="https://youtube.com/... or direct video URL" />
                  </div>
                  <label className="btn-secondary btn-sm cursor-pointer inline-flex items-center gap-1.5 w-fit">
                    {blogUploading === 'video' ? 'Uploading...' : <VideoLibraryRoundedIcon sx={{ fontSize: 14 }} />}
                    <span>Upload Video</span>
                    <input type="file" accept="video/*" className="hidden" onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setBlogUploading('video');
                      try {
                        const url = await uploadAsset(file, 'blog-videos');
                        setBlogForm(p => ({ ...p, video_url: url }));
                        toast.success('Video uploaded!');
                      } catch (error) {
                        toast.error(error?.response?.data?.detail || 'Video upload failed');
                      } finally {
                        setBlogUploading(null);
                        e.target.value = '';
                      }
                    }} />
                  </label>
                  {blogForm.video_url && !/youtu\.be|youtube\.com/i.test(blogForm.video_url) && (
                    <video src={blogForm.video_url} controls className="w-full rounded-2xl border border-theme bg-black" />
                  )}
                </div>
              </Field>
              <Field label="Cover Image URL">
                <div className="space-y-2">
                  <div className="flex gap-2">
                  <input value={blogForm.image_url} onChange={e => setBlogForm(p => ({ ...p, image_url: e.target.value }))} className="input" placeholder="https://..." />
                  <label className="btn-secondary btn-sm cursor-pointer flex-shrink-0">
                    {blogUploading === 'image' ? 'Uploading...' : <ImageRoundedIcon sx={{ fontSize: 14 }} />}
                    <input type="file" accept="image/*" className="hidden" onChange={async e => {
                      if (!e.target.files[0]) return;
                      setBlogUploading('image');
                      try { const url = await uploadAsset(e.target.files[0], 'blog-images'); setBlogForm(p => ({ ...p, image_url: url })); toast.success('Uploaded!'); }
                      catch (error) { toast.error(error?.response?.data?.detail || 'Failed'); } finally { setBlogUploading(null); e.target.value = ''; }
                    }} />
                  </label>
                  </div>
                  {blogForm.image_url && (
                    <img src={blogForm.image_url} alt="Blog cover preview" className="h-28 w-full rounded-2xl border border-theme object-cover" loading="lazy" />
                  )}
                </div>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Tags (comma-separated)">
                <input value={blogForm.tags} onChange={e => setBlogForm(p => ({ ...p, tags: e.target.value }))} className="input" placeholder="arrays, loops, python" />
              </Field>
              <Field label="Est. Read Time (minutes)">
                <input type="number" value={blogForm.estimated_read_time} onChange={e => setBlogForm(p => ({ ...p, estimated_read_time: parseInt(e.target.value) }))} className="input" min="1" />
              </Field>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => saveBlog.mutate({
                  blogId: editingBlog?.id,
                  topicId: selectedTopic?.id,
                  subtopicId: selectedSubtopic?.id,
                  payload: {
                    ...blogForm,
                    tags: blogForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
                    estimated_read_time: Number.parseInt(blogForm.estimated_read_time, 10) || 5,
                  },
                })}
                disabled={!blogForm.title || !blogForm.content || saveBlog.isLoading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <ArticleRoundedIcon sx={{ fontSize: 16 }} /> {editingBlog ? 'Save Changes' : 'Publish Blog Post'}
              </button>
              <button onClick={() => { setShowBlogModal(false); setEditingBlog(null); resetBlogForm(); }} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
