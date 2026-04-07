export const QUESTION_TEMPLATE_COLUMNS = [
  'question_type',
  'question_text',
  'options',
  'correct_options',
  'correct_answer',
  'explanation',
  'marks',
  'negative_marks',
  'difficulty',
  'image_url',
  'branch',
  'is_active',
];

export const QUESTION_TEMPLATE_NOTES = [
  'Use mcq, msq, nat, or fill for question_type.',
  'Use pipe-separated values like A|B|C|D in options for MCQ/MSQ rows.',
  'correct_options uses 1-based comma-separated indexes, such as 1 or 1,3.',
  'Leave options empty and use correct_answer for NAT or FILL questions.',
  'branch and is_active are optional. Use TRUE/FALSE or 1/0 for is_active.',
];

export const CODING_TEMPLATE_COLUMNS = [
  'problem_id',
  'name',
  'statement',
  'constraints',
  'sample_input_1',
  'sample_output_1',
  'sample_input_2',
  'sample_output_2',
  'private_test_cases',
  'difficulty',
  'marks',
  'editorial',
  'banner_url',
  'branch',
  'is_active',
];

export const CODING_TEMPLATE_NOTES = [
  'Use private_test_cases as a JSON array of objects or compact input=>expected_output pairs separated by |.',
  'Leave private_test_cases blank if the problem has no hidden cases.',
  'Use marks for competitor mode and editorial for practice mode.',
  'Use Easy, Medium, or Hard for difficulty.',
  'branch and is_active are optional. Use TRUE/FALSE or 1/0 for is_active.',
];

export async function downloadExcelTemplate(apiClient, endpoint, filename) {
  const response = await apiClient.get(endpoint, { responseType: 'blob' });
  const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}