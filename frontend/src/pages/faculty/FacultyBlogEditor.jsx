import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/common/DashboardLayout';
import RichTextEditor from '../../components/ui/RichTextEditor';
import api from '../../utils/api';
import { FACULTY_NAV } from './FacultyDashboard';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import VideoLibraryRoundedIcon from '@mui/icons-material/VideoLibraryRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';

const SECTION_TYPES = [
  { value: 'aptitude', label: 'Aptitude', icon: PsychologyRoundedIcon, color: 'text-pink-600 bg-pink-50' },
  { value: 'coding', label: 'Coding', icon: CodeRoundedIcon, color: 'text-[#4F7CF3] bg-blue-50' },
  { value: 'technical', label: 'Technical', icon: SettingsRoundedIcon, color: 'text-emerald-600 bg-emerald-50' },
];

function Field({ label, children, helpText }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-secondary">{label}</span>
      {children}
      {helpText ? <span className="mt-1.5 block text-[11px] text-secondary">{helpText}</span> : null}
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

function sanitizeHtml(html = '') {
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
    });
  });

  return doc.body.innerHTML;
}

function parseTags(tags = '') {
  return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
}

function BlogModeToggle({ mode, setMode }) {
  return (
    <div className="inline-flex rounded-2xl border border-theme bg-surface-lighter p-1">
      {[
        { value: 'visual', label: 'Visual editor' },
        { value: 'html', label: 'HTML source' },
      ].map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => setMode(item.value)}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${mode === item.value ? 'bg-[#4F7CF3] text-white shadow-soft' : 'text-secondary hover:text-primary'}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export default function FacultyBlogEditor() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [sectionType, setSectionType] = useState(searchParams.get('section_type') || 'aptitude');
  const [selectedCourseId, setSelectedCourseId] = useState(searchParams.get('courseId') || '');
  const [selectedTopicId, setSelectedTopicId] = useState(searchParams.get('topicId') || '');
  const [selectedSubtopicId, setSelectedSubtopicId] = useState(searchParams.get('subtopicId') || '');
  const [editingBlogId, setEditingBlogId] = useState(searchParams.get('blogId') || '');
  const [isCreatingNewSection, setIsCreatingNewSection] = useState(searchParams.get('newBlog') === '1');
  const [blogForm, setBlogForm] = useState(getEmptyBlogForm());
  const [blogMode, setBlogMode] = useState('visual');
  const [blogUploading, setBlogUploading] = useState(null);

  const { data: coursesData, isLoading: coursesLoading } = useQuery(
    ['faculty-blog-editor-courses', sectionType],
    () => api.get('/courses', { params: { section_type: sectionType, limit: 50 } }).then((r) => r.data),
    { keepPreviousData: true }
  );
  const courses = coursesData?.items || [];

  const { data: courseDetail, isLoading: courseLoading } = useQuery(
    ['faculty-blog-editor-course-detail', selectedCourseId],
    () => api.get(`/courses/${selectedCourseId}`).then((r) => r.data),
    { enabled: !!selectedCourseId }
  );

  const { data: blogList = [], isLoading: blogsLoading } = useQuery(
    ['faculty-blog-editor-blogs', selectedCourseId, selectedTopicId, selectedSubtopicId],
    () => api.get(`/courses/${selectedCourseId}/topics/${selectedTopicId}/subtopics/${selectedSubtopicId}/blogs`).then((r) => r.data),
    { enabled: !!selectedCourseId && !!selectedTopicId && !!selectedSubtopicId }
  );

  const { data: blogDetail } = useQuery(
    ['faculty-blog-editor-blog-detail', editingBlogId],
    () => api.get(`/courses/blogs/${editingBlogId}`).then((r) => r.data),
    { enabled: !!editingBlogId }
  );

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) || null,
    [courses, selectedCourseId]
  );

  const selectedTopic = useMemo(
    () => courseDetail?.topics?.find((topic) => topic.id === selectedTopicId) || null,
    [courseDetail, selectedTopicId]
  );

  const selectedSubtopic = useMemo(
    () => selectedTopic?.subtopics?.find((subtopic) => subtopic.id === selectedSubtopicId) || null,
    [selectedTopic, selectedSubtopicId]
  );

  const syncQuery = (overrides = {}) => {
    const nextParams = {};
    const nextSection = overrides.sectionType ?? sectionType;
    const nextCourseId = overrides.courseId ?? selectedCourseId;
    const nextTopicId = overrides.topicId ?? selectedTopicId;
    const nextSubtopicId = overrides.subtopicId ?? selectedSubtopicId;
    const nextBlogId = overrides.blogId ?? editingBlogId;
    const nextCreateNew = overrides.isCreatingNewSection ?? isCreatingNewSection;

    if (nextSection) nextParams.section_type = nextSection;
    if (nextCourseId) nextParams.courseId = nextCourseId;
    if (nextTopicId) nextParams.topicId = nextTopicId;
    if (nextSubtopicId) nextParams.subtopicId = nextSubtopicId;
    if (nextBlogId) nextParams.blogId = nextBlogId;
    if (nextCreateNew) nextParams.newBlog = '1';

    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    syncQuery();
  }, [sectionType, selectedCourseId, selectedTopicId, selectedSubtopicId, editingBlogId, isCreatingNewSection]);

  useEffect(() => {
    if (!courses.length) return;

    const isValidCourse = courses.some((course) => course.id === selectedCourseId);
    if (!selectedCourseId || !isValidCourse) {
      setSelectedCourseId(courses[0].id);
      setSelectedTopicId('');
      setSelectedSubtopicId('');
      setEditingBlogId('');
      setBlogForm(getEmptyBlogForm());
      setBlogMode('visual');
    }
  }, [courses, selectedCourseId]);

  useEffect(() => {
    if (!courseDetail?.topics?.length) return;

    const courseHasTopic = courseDetail.topics.some((topic) => topic.id === selectedTopicId);
    if (!selectedTopicId || !courseHasTopic) {
      const firstTopic = courseDetail.topics[0];
      setSelectedTopicId(firstTopic?.id || '');
      if (isCreatingNewSection || !(firstTopic?.subtopics?.length)) {
        setSelectedSubtopicId('');
      } else {
        setSelectedSubtopicId(firstTopic?.subtopics?.[0]?.id || '');
      }
      setEditingBlogId('');
      setBlogForm(getEmptyBlogForm());
      setBlogMode('visual');
      return;
    }

    const currentTopic = courseDetail.topics.find((topic) => topic.id === selectedTopicId);
    if (!currentTopic) return;

    const topicHasSubtopic = currentTopic.subtopics?.some((subtopic) => subtopic.id === selectedSubtopicId);
    if (!selectedSubtopicId || !topicHasSubtopic) {
      if (isCreatingNewSection || !(currentTopic.subtopics?.length)) {
        setSelectedSubtopicId('');
      } else {
        setSelectedSubtopicId(currentTopic.subtopics?.[0]?.id || '');
      }
      setEditingBlogId('');
      setBlogForm(getEmptyBlogForm());
      setBlogMode('visual');
    }
  }, [courseDetail, selectedTopicId, selectedSubtopicId, isCreatingNewSection]);

  useEffect(() => {
    if (!blogDetail) return;
    setBlogForm({
      title: blogDetail.title || '',
      content: blogDetail.content || '',
      summary: blogDetail.summary || '',
      video_url: blogDetail.video_url || '',
      image_url: blogDetail.image_url || '',
      tags: Array.isArray(blogDetail.tags) ? blogDetail.tags.join(', ') : '',
      estimated_read_time: blogDetail.estimated_read_time || 5,
    });
    setBlogMode('visual');
  }, [blogDetail]);

  const uploadAsset = async (file, folder) => {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post(`/upload/?folder=${folder}`, fd);
    return data.url;
  };

  const startNewBlog = () => {
    setEditingBlogId('');
    setIsCreatingNewSection(true);
    setSelectedSubtopicId('');
    setBlogForm(getEmptyBlogForm());
    setBlogMode('visual');
  };

  const selectCourse = (courseId) => {
    if (!courseId || courseId === selectedCourseId) return;
    setSelectedCourseId(courseId);
    setIsCreatingNewSection(false);
    setSelectedTopicId('');
    setSelectedSubtopicId('');
    setEditingBlogId('');
    setBlogForm(getEmptyBlogForm());
    setBlogMode('visual');
  };

  const selectTopic = (topicId) => {
    if (!topicId || topicId === selectedTopicId) return;
    const topic = courseDetail?.topics?.find((item) => item.id === topicId);
    setSelectedTopicId(topicId);
    setIsCreatingNewSection(!(topic?.subtopics?.length));
    setSelectedSubtopicId(topic?.subtopics?.[0]?.id || '');
    setEditingBlogId('');
    setBlogForm(getEmptyBlogForm());
    setBlogMode('visual');
  };

  const selectSubtopic = (subtopicId) => {
    if (!subtopicId || subtopicId === selectedSubtopicId) return;
    setIsCreatingNewSection(false);
    setSelectedSubtopicId(subtopicId);
    setEditingBlogId('');
    setBlogForm(getEmptyBlogForm());
    setBlogMode('visual');
  };

  const openBlogEditor = (blog) => {
    setIsCreatingNewSection(false);
    setEditingBlogId(blog.id);
    setBlogForm({
      title: blog.title || '',
      content: blog.content || '',
      summary: blog.summary || '',
      video_url: blog.video_url || '',
      image_url: blog.image_url || '',
      tags: Array.isArray(blog.tags) ? blog.tags.join(', ') : '',
      estimated_read_time: blog.estimated_read_time || 5,
    });
    setBlogMode('visual');
    syncQuery({
      courseId: selectedCourseId,
      topicId: selectedTopicId,
      subtopicId: selectedSubtopicId,
      blogId: blog.id,
    });
  };

  const saveBlog = useMutation(
    ({ blogId, payload }) => (
      blogId
        ? api.put(`/courses/blogs/${blogId}`, payload)
        : selectedSubtopicId
          ? api.post(`/courses/${selectedCourseId}/topics/${selectedTopicId}/subtopics/${selectedSubtopicId}/blogs`, payload)
          : api.post(`/courses/${selectedCourseId}/topics/${selectedTopicId}/blogs`, payload)
    ),
    {
      onSuccess: async (result) => {
        const createdSubtopicId = result?.data?.subtopic_id;
        const invalidations = [
          qc.invalidateQueries(['faculty-blog-editor-course-detail', selectedCourseId]),
          qc.invalidateQueries(['course-detail', selectedCourseId]),
        ];

        if (selectedSubtopicId) {
          invalidations.push(qc.invalidateQueries(['faculty-blog-editor-blogs', selectedCourseId, selectedTopicId, selectedSubtopicId]));
        }
        if (createdSubtopicId) {
          invalidations.push(qc.invalidateQueries(['faculty-blog-editor-blogs', selectedCourseId, selectedTopicId, createdSubtopicId]));
          setSelectedSubtopicId(createdSubtopicId);
          setIsCreatingNewSection(false);
        }

        await Promise.all(invalidations);
        toast.success(editingBlogId ? 'Blog updated!' : 'Blog published!');
        setEditingBlogId('');
        setBlogForm(getEmptyBlogForm());
        setBlogMode('visual');
      },
    }
  );

  const deleteBlog = useMutation(
    (blogId) => api.delete(`/courses/blogs/${blogId}`),
    {
      onSuccess: async () => {
        await Promise.all([
          qc.invalidateQueries(['faculty-blog-editor-course-detail', selectedCourseId]),
          qc.invalidateQueries(['faculty-blog-editor-blogs', selectedCourseId, selectedTopicId, selectedSubtopicId]),
          qc.invalidateQueries(['course-detail', selectedCourseId]),
        ]);
        if (editingBlogId) {
          startNewBlog();
        }
        toast.success('Blog deleted');
      },
    }
  );

  const previewHtml = sanitizeHtml(blogForm.content || '<p class="text-secondary">Preview will appear here.</p>');

  return (
    <DashboardLayout navItems={FACULTY_NAV} role="faculty">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4F7CF3]">Faculty blog workspace</p>
            <h1 className="page-title mt-2 flex items-center gap-2">
              <ArticleRoundedIcon sx={{ fontSize: 26 }} className="text-[#4F7CF3]" /> Blog Editor
            </h1>
            <p className="mt-1 text-sm text-secondary">
              Write blogs in a visual editor or paste direct HTML. Images and videos inserted from the toolbar are uploaded to S3 automatically.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/faculty/courses" className="btn-secondary btn-sm inline-flex items-center gap-2">
              <SchoolRoundedIcon sx={{ fontSize: 14 }} /> Courses
            </Link>
            <button onClick={startNewBlog} className="btn-primary btn-sm inline-flex items-center gap-2">
              <AddRoundedIcon sx={{ fontSize: 14 }} /> New Blog Section
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-6 lg:h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
            <div className="card p-4">
              <p className="text-sm font-semibold text-primary">Section</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SECTION_TYPES.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.value}
                      type="button"
                      onClick={() => {
                        setSectionType(section.value);
                        setSelectedCourseId('');
                        setSelectedTopicId('');
                        setSelectedSubtopicId('');
                        setEditingBlogId('');
                        setBlogForm(getEmptyBlogForm());
                        setBlogMode('visual');
                      }}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${sectionType === section.value ? 'border-transparent text-white shadow-soft' : 'border-theme bg-surface-card text-secondary hover:text-primary'}`}
                      style={sectionType === section.value ? { background: 'linear-gradient(135deg,#4F7CF3,#7C8CFF)' } : {}}
                    >
                      <Icon sx={{ fontSize: 16 }} />
                      {section.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-primary">Course Navigator</p>
                <span className="badge badge-primary text-[11px]">{courses.length} courses</span>
              </div>
              <div className="mt-4 space-y-3">
                {coursesLoading ? (
                  <p className="text-sm text-secondary">Loading courses...</p>
                ) : courses.length === 0 ? (
                  <p className="text-sm text-secondary">No courses available for this section.</p>
                ) : (
                  courses.map((course) => {
                    const isSelected = course.id === selectedCourseId;
                    const isOpen = isSelected || course.id === selectedCourseId;
                    return (
                      <div key={course.id} className="rounded-2xl border border-theme bg-surface-card p-3">
                        <button
                          type="button"
                          onClick={() => selectCourse(course.id)}
                          className={`flex w-full items-start gap-3 text-left ${isSelected ? '' : ''}`}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4F7CF3]/10 text-[#4F7CF3]">
                            <MenuBookRoundedIcon sx={{ fontSize: 18 }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-primary">{course.title}</p>
                            <p className="mt-1 text-xs text-secondary">{course.topic_count || 0} topics</p>
                          </div>
                        </button>

                        {isOpen && courseDetail?.topics?.length ? (
                          <div className="mt-3 space-y-2 pl-1">
                            {courseDetail.topics.map((topic, topicIndex) => {
                              const topicActive = topic.id === selectedTopicId;
                              return (
                                <div key={topic.id}>
                                  <button
                                    type="button"
                                    onClick={() => selectTopic(topic.id)}
                                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-all ${topicActive ? 'bg-blue-50 text-[#4F7CF3] dark:bg-blue-900/10' : 'text-secondary hover:bg-surface-lighter hover:text-primary'}`}
                                  >
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-lighter text-xs font-bold text-primary">
                                      {topicIndex + 1}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate">{topic.title}</span>
                                  </button>

                                  {topicActive && (
                                    <div className="mt-2 space-y-1 pl-8">
                                      {(topic.subtopics || []).map((subtopic, subIndex) => {
                                        const subActive = subtopic.id === selectedSubtopicId;
                                        return (
                                          <button
                                            key={subtopic.id}
                                            type="button"
                                            onClick={() => selectSubtopic(subtopic.id)}
                                            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-all ${subActive ? 'bg-[#4F7CF3] text-white shadow-soft' : 'bg-surface-lighter text-secondary hover:text-primary'}`}
                                          >
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/75 text-[11px] font-bold text-primary">
                                              {topicIndex + 1}.{subIndex + 1}
                                            </span>
                                            <span className="min-w-0 flex-1 truncate">{subtopic.title}</span>
                                            <span className="opacity-80">{subtopic.blog_count || 0}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : courseLoading ? (
                          <p className="mt-3 text-xs text-secondary">Loading topics...</p>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </aside>

          <main className="space-y-6">
            {!selectedCourseId || !selectedTopicId ? (
              <div className="card flex min-h-[360px] items-center justify-center p-8 text-center">
                <div className="max-w-lg">
                  <SchoolRoundedIcon sx={{ fontSize: 42 }} className="mx-auto text-muted" />
                  <h2 className="mt-4 text-xl font-bold text-primary">Select a course and topic</h2>
                  <p className="mt-2 text-sm leading-6 text-secondary">
                    The editor opens here once you choose a topic from the left navigation.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="card p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Current location</p>
                      <h2 className="mt-2 text-lg font-bold text-primary">
                        {selectedCourse?.title || 'Course'}
                      </h2>
                      <p className="mt-1 text-sm text-secondary">
                        {selectedTopic?.title || 'Topic'} · {selectedSubtopic?.title || (isCreatingNewSection ? 'New blog section' : 'Blog section')}
                      </p>
                      {!selectedSubtopicId ? (
                        <p className="mt-2 inline-flex rounded-full border border-dashed border-[#4F7CF3]/30 bg-blue-50/40 px-3 py-1 text-[11px] font-medium text-[#4F7CF3]">
                          Publishing will create the blog section automatically.
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={startNewBlog} className="btn-secondary btn-sm inline-flex items-center gap-2">
                        <AddRoundedIcon sx={{ fontSize: 14 }} /> New Blog Section
                      </button>
                      {editingBlogId ? (
                        <button type="button" onClick={() => deleteBlog.mutate(editingBlogId)} className="btn-danger btn-sm inline-flex items-center gap-2">
                          <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} /> Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="card p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-primary">Blog Editor</p>
                      <p className="text-xs text-secondary">Use the visual editor or switch to HTML source for direct code editing. Media inserted from the editor is stored in S3.</p>
                    </div>
                    <BlogModeToggle mode={blogMode} setMode={setBlogMode} />
                  </div>

                  <Field label="Blog title *">
                    <input
                      value={blogForm.title}
                      onChange={(event) => setBlogForm((prev) => ({ ...prev, title: event.target.value }))}
                      className="input"
                      placeholder="e.g. Understanding Arithmetic Progressions"
                    />
                  </Field>

                  <Field label="Summary" helpText="Shown in the blog listing.">
                    <textarea
                      value={blogForm.summary}
                      onChange={(event) => setBlogForm((prev) => ({ ...prev, summary: event.target.value }))}
                      className="input resize-none"
                      rows={2}
                      placeholder="Short description of the blog post..."
                    />
                  </Field>

                  <Field label={blogMode === 'html' ? 'HTML content' : 'Content *'} helpText={blogMode === 'html' ? 'Paste or type direct HTML here.' : 'Use the toolbar to write like a word processor.'}>
                    {blogMode === 'visual' ? (
                      <RichTextEditor
                        value={blogForm.content}
                        onChange={(content) => setBlogForm((prev) => ({ ...prev, content }))}
                        placeholder="Write your blog content here..."
                      />
                    ) : (
                      <textarea
                        value={blogForm.content}
                        onChange={(event) => setBlogForm((prev) => ({ ...prev, content: event.target.value }))}
                        className="input min-h-[340px] font-mono text-sm leading-6"
                        placeholder="<h2>Heading</h2><p>Paste your HTML here...</p>"
                        spellCheck={false}
                      />
                    )}
                  </Field>

                  {blogMode === 'html' ? (
                    <div className="rounded-2xl border border-theme bg-surface-lighter p-4">
                      <p className="text-xs font-semibold text-secondary">Preview</p>
                      <div
                        className="prose prose-sm mt-3 max-w-none dark:prose-invert [&_.ql-align-center]:text-center [&_.ql-align-right]:text-right [&_.ql-align-justify]:text-justify [&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-2xl [&_video]:my-4 [&_video]:max-w-full [&_video]:rounded-2xl [&_video]:bg-black"
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                      />
                    </div>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Video URL or Upload">
                      <div className="space-y-2">
                        <input
                          value={blogForm.video_url}
                          onChange={(event) => setBlogForm((prev) => ({ ...prev, video_url: event.target.value }))}
                          className="input"
                          placeholder="https://youtube.com/... or direct video URL"
                        />
                        <label className="btn-secondary btn-sm inline-flex w-fit cursor-pointer items-center gap-1.5">
                          {blogUploading === 'video' ? 'Uploading...' : <VideoLibraryRoundedIcon sx={{ fontSize: 14 }} />}
                          <span>Upload Video</span>
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={async (event) => {
                              const file = event.target.files?.[0];
                              if (!file) return;
                              setBlogUploading('video');
                              try {
                                const url = await uploadAsset(file, 'blog-videos');
                                setBlogForm((prev) => ({ ...prev, video_url: url }));
                                toast.success('Video uploaded!');
                              } catch (error) {
                                toast.error(error?.response?.data?.detail || 'Video upload failed');
                              } finally {
                                setBlogUploading(null);
                                event.target.value = '';
                              }
                            }}
                          />
                        </label>
                      </div>
                    </Field>

                    <Field label="Cover image URL">
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            value={blogForm.image_url}
                            onChange={(event) => setBlogForm((prev) => ({ ...prev, image_url: event.target.value }))}
                            className="input"
                            placeholder="https://..."
                          />
                          <label className="btn-secondary btn-sm inline-flex cursor-pointer flex-shrink-0 items-center gap-1.5">
                            {blogUploading === 'image' ? 'Uploading...' : <ImageRoundedIcon sx={{ fontSize: 14 }} />}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (event) => {
                                const file = event.target.files?.[0];
                                if (!file) return;
                                setBlogUploading('image');
                                try {
                                  const url = await uploadAsset(file, 'blog-images');
                                  setBlogForm((prev) => ({ ...prev, image_url: url }));
                                  toast.success('Image uploaded!');
                                } catch (error) {
                                  toast.error(error?.response?.data?.detail || 'Image upload failed');
                                } finally {
                                  setBlogUploading(null);
                                  event.target.value = '';
                                }
                              }}
                            />
                          </label>
                        </div>
                        {blogForm.image_url ? (
                          <img src={blogForm.image_url} alt="Blog cover preview" className="h-28 w-full rounded-2xl border border-theme object-cover" loading="lazy" />
                        ) : null}
                      </div>
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Tags (comma-separated)">
                      <input
                        value={blogForm.tags}
                        onChange={(event) => setBlogForm((prev) => ({ ...prev, tags: event.target.value }))}
                        className="input"
                        placeholder="arrays, loops, python"
                      />
                    </Field>
                    <Field label="Estimated read time (minutes)">
                      <input
                        type="number"
                        min="1"
                        value={blogForm.estimated_read_time}
                        onChange={(event) => setBlogForm((prev) => ({ ...prev, estimated_read_time: event.target.value }))}
                        className="input"
                      />
                    </Field>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => saveBlog.mutate({
                        blogId: editingBlogId,
                        payload: {
                          ...blogForm,
                          tags: parseTags(blogForm.tags),
                          estimated_read_time: Number.parseInt(blogForm.estimated_read_time, 10) || 5,
                        },
                      })}
                      disabled={!blogForm.title || !blogForm.content || saveBlog.isLoading}
                      className="btn-primary inline-flex items-center gap-2"
                    >
                      <SaveRoundedIcon sx={{ fontSize: 16 }} /> {editingBlogId ? 'Save Changes' : 'Publish Blog'}
                    </button>
                    <button type="button" onClick={() => navigate('/faculty/courses')} className="btn-secondary inline-flex items-center gap-2">
                      <CloseRoundedIcon sx={{ fontSize: 16 }} /> Close
                    </button>
                  </div>
                </div>

                <div className="card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-primary">Existing blogs</p>
                      <p className="text-xs text-secondary">Edit any post in this topic or create a fresh one.</p>
                    </div>
                    <span className="badge badge-primary text-[11px]">{blogsLoading ? 'Loading' : `${blogList.length} posts`}</span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {blogsLoading ? (
                      <p className="text-sm text-secondary">Loading blogs...</p>
                    ) : blogList.length === 0 ? (
                      <p className="text-sm text-secondary">No blogs yet for this section.</p>
                    ) : (
                      blogList.map((blog) => {
                        const isActive = blog.id === editingBlogId;
                        return (
                          <div key={blog.id} className={`rounded-2xl border p-4 ${isActive ? 'border-[#4F7CF3] bg-blue-50/40 dark:bg-blue-900/10' : 'border-theme bg-surface-card'}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-primary">{blog.title}</p>
                                <p className="mt-1 line-clamp-2 text-xs text-secondary">{blog.summary || 'No summary provided.'}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <span className="badge badge-medium text-xs">{blog.estimated_read_time || 5} min</span>
                                  {blog.video_url ? <span className="badge badge-primary text-xs">Video</span> : null}
                                  {blog.image_url ? <span className="badge badge-mint text-xs">Cover</span> : null}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button type="button" onClick={() => openBlogEditor(blog)} className="btn-secondary btn-xs p-1.5">
                                  <EditRoundedIcon sx={{ fontSize: 14 }} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm('Delete this blog post?')) {
                                      deleteBlog.mutate(blog.id);
                                    }
                                  }}
                                  className="btn-danger btn-xs p-1.5"
                                >
                                  <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
}
