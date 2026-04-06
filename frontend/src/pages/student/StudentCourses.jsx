import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import PaginationControls from '../../components/student/PaginationControls';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import VideoLibraryRoundedIcon from '@mui/icons-material/VideoLibraryRounded';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import RemoveRedEyeRoundedIcon from '@mui/icons-material/RemoveRedEyeRounded';
import ThumbUpRoundedIcon from '@mui/icons-material/ThumbUpRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

const SECTION_TYPES = [
  { value: '', label: 'All', icon: SchoolRoundedIcon },
  { value: 'aptitude', label: 'Aptitude', icon: PsychologyRoundedIcon },
  { value: 'coding', label: 'Coding', icon: CodeRoundedIcon },
  { value: 'technical', label: 'Technical', icon: SettingsRoundedIcon },
];
const DIFFS = ['All', 'Beginner', 'Intermediate', 'Advanced'];

function ProgressRing({ pct, size = 36 }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" className="-rotate-90">
      <circle cx="18" cy="18" r={r} fill="none" stroke="rgb(var(--border-color))" strokeWidth="3" />
      <circle cx="18" cy="18" r={r} fill="none" stroke="#4F7CF3" strokeWidth="3"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
    </svg>
  );
}

function isHtmlContent(content = '') {
  return /<\/?[a-z][\s\S]*>/i.test(content);
}

function sanitizeBlogHtml(html = '') {
  if (typeof window === 'undefined' || !html) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, link, meta, base, iframe, object, embed').forEach((node) => node.remove());

  doc.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();

      if (name.startsWith('on')) {
        node.removeAttribute(attr.name);
      }
      if (name === 'href' && !/^(https?:|mailto:|#|\/)/i.test(value)) {
        node.removeAttribute('href');
      }
      if (name === 'src' && !/^(https?:|data:|\/)/i.test(value)) {
        node.removeAttribute('src');
      }
      if (name === 'contenteditable') {
        node.removeAttribute('contenteditable');
      }
    });
  });

  return doc.body.innerHTML;
}

function BlogContent({ content }) {
  const proseClasses = `prose prose-sm sm:prose max-w-none dark:prose-invert
    [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-primary [&_h1]:mt-8 [&_h1]:mb-4
    [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-primary [&_h2]:mt-6 [&_h2]:mb-3
    [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-primary [&_h3]:mt-5 [&_h3]:mb-2
    [&_p]:text-secondary [&_p]:leading-relaxed [&_p]:mb-4
    [&_code]:bg-surface-lighter [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-xs [&_code]:font-mono [&_code]:text-[#4F7CF3]
    [&_pre]:bg-surface-lighter [&_pre]:rounded-2xl [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-4
    [&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-2xl [&_img]:shadow-sm
    [&_video]:my-4 [&_video]:max-w-full [&_video]:rounded-2xl [&_video]:bg-black
    [&_blockquote]:border-l-4 [&_blockquote]:border-[#4F7CF3] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-secondary
    [&_.ql-align-center]:text-center [&_.ql-align-right]:text-right [&_.ql-align-justify]:text-justify
    [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul_li]:text-secondary [&_ul_li]:mb-1
    [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_ol_li]:text-secondary [&_ol_li]:mb-1
    [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-theme [&_td]:p-2 [&_th]:border [&_th]:border-theme [&_th]:p-2 [&_th]:bg-surface-lighter [&_th]:font-semibold`;

  if (isHtmlContent(content)) {
    return (
      <div
        className={proseClasses}
        dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(content) }}
      />
    );
  }

  return (
    <div className={proseClasses}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

function CourseCard({ course, onOpen }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="card-hover group cursor-pointer flex flex-col" onClick={() => onOpen(course)}>
      <div className="h-36 rounded-t-2xl overflow-hidden bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] relative flex-shrink-0">
        {course.thumbnail_url
          ? <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" loading="lazy" />
          : <div className="h-full w-full flex items-center justify-center opacity-20"><SchoolRoundedIcon sx={{ fontSize: 52 }} /></div>
        }
        <div className="absolute top-3 left-3">
          <span className={`badge text-xs ${
            course.difficulty === 'Advanced' ? 'badge-hard' :
            course.difficulty === 'Intermediate' ? 'badge-medium' : 'badge-easy'
          }`}>{course.difficulty}</span>
        </div>
        {course.completion_percentage > 0 && (
          <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-1 shadow-sm">
            <ProgressRing pct={course.completion_percentage} />
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1 gap-2">
        <h3 className="font-semibold text-sm text-primary leading-snug group-hover:text-[#4F7CF3] transition-colors">{course.title}</h3>
        <p className="text-xs text-secondary line-clamp-2 flex-1">{course.description}</p>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-theme">
          <div className="text-xs text-secondary">{course.topic_count || 0} topics</div>
          {course.completion_percentage > 0 ? (
            <span className="text-xs font-semibold text-[#4F7CF3]">{course.completion_percentage}% done</span>
          ) : (
            <span className="text-xs text-secondary">Not started</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function BlogReader({ blog, courseId, topicId, subtopicId, allBlogs, blogIndex, onNavigate, onClose, onProgressSaved }) {
  const qc = useQueryClient();
  const isCompleted = blog.completed;

  const markDone = useMutation(
    (shouldCloseAfterSave = false) => api.post(`/courses/blogs/${blog.id}/progress`, { completed: true }),
    {
      onSuccess: (_, shouldCloseAfterSave) => {
        qc.invalidateQueries(['course-detail-student', courseId]);
        qc.invalidateQueries(['my-course-progress', courseId]);
        qc.invalidateQueries(['student-all-progress']);
        onProgressSaved?.(blog.id);
        if (shouldCloseAfterSave) {
          onClose();
        }
      },
    }
  );

  // Extract YouTube video ID
  const getYTId = (url) => {
    if (!url) return null;
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    return m ? m[1] : null;
  };
  const ytId = getYTId(blog.video_url);

  return (
    <div data-lenis-prevent className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-surface/95 backdrop-blur-sm">
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-theme bg-surface-card px-4 py-3 flex-shrink-0">
        <button onClick={onClose} className="btn-ghost btn-sm p-1.5 flex-shrink-0">
          <CloseRoundedIcon sx={{ fontSize: 18 }} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-secondary truncate">{blog.course_title}</p>
          <p className="font-semibold text-sm text-primary truncate">{blog.title}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-secondary hidden sm:flex items-center gap-1"><AccessTimeRoundedIcon sx={{ fontSize: 14 }} />{blog.estimated_read_time || 5} min</span>
          <span className="text-xs text-secondary hidden sm:flex items-center gap-1"><RemoveRedEyeRoundedIcon sx={{ fontSize: 14 }} />{blog.views || 0}</span>
          {!isCompleted && (
            <button onClick={() => markDone.mutate(false)} disabled={markDone.isLoading}
              className="btn-success btn-sm flex items-center gap-1.5">
              <CheckCircleRoundedIcon sx={{ fontSize: 14 }} /> Mark Done
            </button>
          )}
          {isCompleted && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <CheckCircleRoundedIcon sx={{ fontSize: 14 }} /> Completed
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        data-lenis-prevent-wheel
        data-lenis-prevent-touch
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        <div className="mx-auto max-w-3xl px-4 pt-2 pb-8">
        {/* Cover image */}
        {blog.image_url && (
          <div className="mb-5 overflow-hidden rounded-3xl border border-theme bg-white p-2 shadow-soft">
            <img src={blog.image_url} alt={blog.title} className="w-full max-h-[320px] object-contain rounded-2xl" />
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-3">{blog.title}</h1>
        <div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-theme">
          <span className="text-xs text-secondary">By {blog.author_name}</span>
          {(blog.tags || []).map(t => <span key={t} className="badge badge-primary text-xs">{t}</span>)}
        </div>

        {/* Video */}
        {blog.video_url && (
          ytId ? (
            <div className="mb-8 rounded-2xl overflow-hidden aspect-video bg-black">
              <iframe src={`https://www.youtube.com/embed/${ytId}`} title={blog.title}
                className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
            </div>
          ) : (
            <div className="mb-8 rounded-2xl overflow-hidden bg-black">
              <video src={blog.video_url} controls className="w-full max-h-[420px] bg-black" preload="metadata" />
            </div>
          )
        )}

        <BlogContent content={blog.content} />

        {/* Navigation */}
        <div className="flex justify-between gap-4 mt-10 pt-8 border-t border-theme">
          {blogIndex > 0 ? (
            <button onClick={() => onNavigate(blogIndex - 1)} className="btn-secondary flex items-center gap-2">
              <ArrowBackRoundedIcon sx={{ fontSize: 16 }} /> Previous
            </button>
          ) : <div />}
          {blogIndex < allBlogs.length - 1 ? (
            <button onClick={() => onNavigate(blogIndex + 1)} className="btn-primary flex items-center gap-2">
              Next <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
            </button>
          ) : (
            <button onClick={() => markDone.mutate(true)} disabled={markDone.isLoading} className="btn-success flex items-center gap-2">
              <CheckCircleRoundedIcon sx={{ fontSize: 16 }} /> Finish Course
            </button>
          )}
        </div>
          </div>
      </div>
    </div>
  );
}

function CourseDetailView({ courseId, onBack }) {
  const qc = useQueryClient();
  const [expandedTopics, setExpandedTopics] = useState({});
  const [activeBlog, setActiveBlog] = useState(null);
  const [allBlogsFlat, setAllBlogsFlat] = useState([]);

  const { data: course, isLoading } = useQuery(
    ['course-detail-student', courseId],
    () => api.get(`/courses/${courseId}`).then(r => r.data)
  );
  const { data: myProgress } = useQuery(
    ['my-course-progress', courseId],
    () => api.get(`/courses/${courseId}/my-progress`).then(r => r.data)
  );

  const progressMap = {};
  (myProgress?.progress || []).forEach(p => { progressMap[p.blog_id] = p.completed; });

  const openBlog = async (blog, topic, subtopic) => {
    const { data } = await api.get(`/courses/blogs/${blog.id}`);
    // flatten all blogs for navigation
    const flat = [];
    (course?.topics || []).forEach(t => {
      (t.subtopics || []).forEach(st => {
        (st.blogs || []).forEach(b => flat.push({ ...b, topicId: t.id, subtopicId: st.id }));
      });
    });
    setAllBlogsFlat(flat);
    setActiveBlog({ ...data, completed: progressMap[data.id], topicId: topic.id, subtopicId: subtopic.id });
  };

  const navigateBlog = async (idx) => {
    const b = allBlogsFlat[idx];
    if (!b) return;
    const { data } = await api.get(`/courses/blogs/${b.id}`);
    setActiveBlog({ ...data, completed: progressMap[data.id], topicId: b.topicId, subtopicId: b.subtopicId });
  };

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>;
  if (!course) return null;

  const pct = myProgress?.completion_percentage || 0;

  return (
    <div className="space-y-5">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn-secondary btn-sm flex items-center gap-1.5">
          <ArrowBackRoundedIcon sx={{ fontSize: 14 }} /> All Courses
        </button>
      </div>

      <div className="card p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {course.thumbnail_url && (
            <img src={course.thumbnail_url} alt={course.title} className="h-28 w-44 rounded-2xl object-cover flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-primary">{course.title}</h1>
            <p className="text-sm text-secondary mt-1">{course.description}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {(course.tags || []).map(t => <span key={t} className="badge badge-primary text-xs">{t}</span>)}
              <span className="badge badge-medium">{course.difficulty}</span>
            </div>
          </div>
          <div className="flex-shrink-0 flex flex-col items-center justify-center gap-1">
            <ProgressRing pct={pct} size={56} />
            <p className="text-xs font-semibold text-[#4F7CF3]">{pct}%</p>
            <p className="text-xs text-secondary">{myProgress?.completed || 0}/{myProgress?.total_blogs || 0} done</p>
          </div>
        </div>
      </div>

      {/* Topics & sub-topics */}
      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-primary">Course Content</h2>
        {(course.topics || []).length === 0 ? (
          <p className="text-secondary text-sm text-center py-6">No content yet</p>
        ) : (
          course.topics.map((topic, ti) => (
            <div key={topic.id} className="rounded-2xl border border-theme overflow-hidden">
              <button onClick={() => setExpandedTopics(p => ({ ...p, [topic.id]: !p[topic.id] }))}
                className="w-full flex items-center gap-3 px-4 py-3 bg-surface-lighter hover:bg-surface text-left transition-colors">
                <motion.span animate={{ rotate: expandedTopics[topic.id] ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ExpandMoreRoundedIcon sx={{ fontSize: 18 }} className="text-secondary" />
                </motion.span>
                <span className="w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg,#4F7CF3,#7C8CFF)' }}>{ti + 1}</span>
                <span className="font-semibold text-sm text-primary flex-1 text-left">{topic.title}</span>
                <span className="text-xs text-secondary flex-shrink-0">{topic.subtopics?.length || 0} sub-topics</span>
              </button>

              <AnimatePresence>
                {expandedTopics[topic.id] && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="bg-surface-card px-4 py-3 space-y-2">
                      {(topic.subtopics || []).map((sub, si) => (
                        <div key={sub.id}>
                          <p className="text-xs font-semibold text-secondary mb-1.5 flex items-center gap-1.5">
                            <span>{ti + 1}.{si + 1}</span> {sub.title}
                          </p>
                          {(sub.blogs || []).map(blog => (
                            <button key={blog.id} onClick={() => openBlog(blog, topic, sub)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-lighter border border-transparent hover:border-theme transition-all group mb-1">
                              {progressMap[blog.id]
                                ? <CheckCircleRoundedIcon sx={{ fontSize: 16 }} className="text-emerald-500 flex-shrink-0" />
                                : <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 16 }} className="text-muted flex-shrink-0" />
                              }
                              <span className="flex-1 text-left text-sm text-primary group-hover:text-[#4F7CF3] transition-colors">{blog.title}</span>
                              {blog.video_url && <VideoLibraryRoundedIcon sx={{ fontSize: 14 }} className="text-secondary flex-shrink-0" />}
                              <span className="text-xs text-secondary flex-shrink-0 hidden sm:block">{blog.estimated_read_time || 5} min</span>
                              <ArrowForwardRoundedIcon sx={{ fontSize: 14 }} className="text-muted group-hover:text-[#4F7CF3] flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>

      {/* Blog reader overlay */}
      {activeBlog && (
        <BlogReader
          blog={activeBlog}
          courseId={courseId}
          topicId={activeBlog.topicId}
          subtopicId={activeBlog.subtopicId}
          allBlogs={allBlogsFlat}
          blogIndex={allBlogsFlat.findIndex(b => b.id === activeBlog.id)}
          onNavigate={navigateBlog}
          onClose={() => setActiveBlog(null)}
          onProgressSaved={() => setActiveBlog((current) => current ? { ...current, completed: true } : current)}
        />
      )}
    </div>
  );
}

export default function StudentCourses() {
  const [sectionType, setSectionType] = useState('');
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('All');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const PAGE_SIZE = 9;

  const { data: coursesData, isLoading } = useQuery(
    ['student-courses', sectionType, search, page, difficulty],
    () => api.get('/courses', {
      params: {
        section_type: sectionType || undefined,
        search: search || undefined,
        page, limit: PAGE_SIZE,
        difficulty: difficulty !== 'All' ? difficulty : undefined,
      }
    }).then(r => r.data),
    { keepPreviousData: true }
  );

  const { data: myProgress } = useQuery('student-all-progress', () => api.get('/courses/my-all-progress').then(r => r.data));

  const progressByCourse = {};
  (myProgress || []).forEach(p => { progressByCourse[p.course?.id] = p.completion_percentage; });

  const courses = (coursesData?.items || []).map(c => ({ ...c, completion_percentage: progressByCourse[c.id] || 0 }));
  const total = coursesData?.total || 0;

  if (selectedCourse) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <CourseDetailView courseId={selectedCourse} onBack={() => setSelectedCourse(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="section-title flex items-center gap-2"><SchoolRoundedIcon sx={{ fontSize: 22 }} className="text-[#4F7CF3]" /> Courses</h1>
        <p className="text-sm text-secondary mt-0.5">Structured learning paths for Aptitude, Coding & Technical skills</p>
      </div>

      {/* My progress strip */}
      {(myProgress || []).length > 0 && (
        <div className="card p-4">
          <p className="text-sm font-semibold text-primary mb-3">Continue Learning</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {(myProgress || []).slice(0, 4).map(p => (
              <button key={p.course?.id} onClick={() => setSelectedCourse(p.course?.id)}
                className="flex items-center gap-3 rounded-2xl border border-theme p-3 hover:border-[#4F7CF3] transition-all min-w-[220px] flex-shrink-0 text-left">
                <ProgressRing pct={p.completion_percentage} size={36} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary truncate">{p.course?.title}</p>
                  <p className="text-xs text-secondary">{p.completion_percentage}% complete</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Section filter tabs */}
      <div className="flex flex-wrap gap-2">
        {SECTION_TYPES.map(s => (
          <button key={s.value} onClick={() => { setSectionType(s.value); setPage(1); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${sectionType === s.value ? 'border-[#4F7CF3] text-white' : 'border-theme bg-surface-card text-secondary hover:border-[#4F7CF3] hover:text-[#4F7CF3]'}`}
            style={sectionType === s.value ? { background: 'linear-gradient(135deg,#4F7CF3,#7C8CFF)' } : {}}>
            <s.icon sx={{ fontSize: 15 }} /> {s.label}
          </button>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <label className="flex items-center gap-2 flex-1 rounded-2xl border border-theme bg-surface-card px-3 py-2.5 focus-within:border-[#4F7CF3] transition-all">
          <SearchRoundedIcon sx={{ fontSize: 18 }} className="text-secondary flex-shrink-0" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search courses…" className="w-full bg-transparent text-sm text-primary outline-none placeholder:text-muted" />
        </label>
        <button onClick={() => setShowFilters(v => !v)} className={`btn-secondary text-xs flex items-center gap-2 flex-shrink-0 ${showFilters ? 'border-[#4F7CF3] text-[#4F7CF3]' : ''}`}>
          <TuneRoundedIcon sx={{ fontSize: 16 }} /> Filters {difficulty !== 'All' && <span className="w-2 h-2 rounded-full bg-[#4F7CF3]" />}
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-wrap gap-2 overflow-hidden">
            <span className="text-xs text-secondary self-center">Level:</span>
            {DIFFS.map(d => <button key={d} onClick={() => { setDifficulty(d); setPage(1); }} className={`pill text-xs ${difficulty === d ? 'active' : ''}`}>{d}</button>)}
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-theme overflow-hidden">
              <div className="skeleton h-36" /><div className="p-4 space-y-2"><div className="skeleton h-4 w-3/4" /><div className="skeleton h-3 w-full" /><div className="skeleton h-3 w-1/2" /></div>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="card p-12 text-center">
          <SchoolRoundedIcon sx={{ fontSize: 40 }} className="text-muted mx-auto mb-3" />
          <p className="text-secondary font-medium">No courses found</p>
          <p className="text-xs text-muted mt-1">Check back later for new courses</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courses.map(c => <CourseCard key={c.id} course={c} onOpen={c => setSelectedCourse(c.id)} />)}
        </div>
      )}

      <PaginationControls page={page} total={total} limit={PAGE_SIZE} onPageChange={setPage} />
    </div>
  );
}
