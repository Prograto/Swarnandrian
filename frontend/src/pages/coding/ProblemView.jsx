// ProblemView - redirects to CodeEditor
import { useParams, Navigate } from 'react-router-dom';
export default function ProblemView() {
  const { problemId } = useParams();
  return <Navigate to={`/code/${problemId}`} replace />;
}
