import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  Clock,
  FileJson,
  Play,
  Plus,
  Trash2,
  Menu,
  Download,
  Upload,
  Calculator
} from 'lucide-react';

/* --- Types --- */
type QuestionType = 'MCQ' | 'MSQ' | 'NAT';

interface JsonQuestion {
  id: number | string;
  type: QuestionType;
  questionText: string;
  section?: string;
  options?: string[];
  correctAnswer: string | string[];
  positiveMarks: number;
  negativeMarks: number;
}

interface JsonData {
  examType: string;
  questions: JsonQuestion[];
}

interface Question {
  id: string;
  text: string;
  topic?: string;
  section?: string;
  type: QuestionType;
  options?: string[];
  correctAnswer: string | string[];
  marks: number;
  negativeMarks: number;
}

interface QuestionStatus {
  visited: boolean;
  answered: boolean;
  markedForReview: boolean;
  selectedOption: string | string[] | null;
  timeSpentSeconds: number;
}

interface TestData {
  title: string;
  durationMinutes: number;
  questions: Question[];
  examType: string;
}

interface ExamConfig {
  id: string;
  name: string;
  durationMinutes: number;
  totalQuestions: number;
  maxMarks: number;
}

const EXAM_CONFIGS: Record<string, ExamConfig> = {
  GATE: { id: 'GATE', name: 'GATE', durationMinutes: 180, totalQuestions: 65, maxMarks: 100 },
  ESE_PRELIMS_PAPER_1: { id: 'ESE_PRELIMS_PAPER_1', name: 'ESE Prelims Paper 1', durationMinutes: 120, totalQuestions: 100, maxMarks: 200 },
  ESE_PRELIMS_PAPER_2: { id: 'ESE_PRELIMS_PAPER_2', name: 'ESE Prelims Paper 2', durationMinutes: 180, totalQuestions: 150, maxMarks: 300 },
  SSC_CGL_TIER_1: { id: 'SSC_CGL_TIER_1', name: 'SSC CGL Tier 1', durationMinutes: 60, totalQuestions: 100, maxMarks: 200 },
  SSC_CGL_TIER_2: { id: 'SSC_CGL_TIER_2', name: 'SSC CGL Tier 2', durationMinutes: 135, totalQuestions: 150, maxMarks: 450 },
  SSC_CHSL_TIER_1: { id: 'SSC_CHSL_TIER_1', name: 'SSC CHSL Tier 1', durationMinutes: 60, totalQuestions: 100, maxMarks: 200 },
  SSC_CHSL_TIER_2: { id: 'SSC_CHSL_TIER_2', name: 'SSC CHSL Tier 2', durationMinutes: 135, totalQuestions: 135, maxMarks: 405 },
  JEE_MAINS: { id: 'JEE_MAINS', name: 'JEE Mains', durationMinutes: 180, totalQuestions: 90, maxMarks: 300 },
  JEE_ADVANCED: { id: 'JEE_ADVANCED', name: 'JEE Advanced', durationMinutes: 180, totalQuestions: 54, maxMarks: 180 },
  NEET: { id: 'NEET', name: 'NEET', durationMinutes: 200, totalQuestions: 200, maxMarks: 720 },
};

/* --- Sample Data --- */
const GATE_SAMPLE_JSON = {
  "examType": "GATE",
  "questions": [
    {
      "id": 1,
      "type": "NAT",
      "topic": "Engineering Mathematics - Calculus",
      "questionText": "Find the limit as x approaches 0 of (sin x)/x.",
      "correctAnswer": "1",
      "positiveMarks": 1,
      "negativeMarks": 0
    },
    {
      "id": 2,
      "type": "MSQ",
      "topic": "Computer Science - Operating Systems",
      "questionText": "Which of the following are valid CPU scheduling algorithms?",
      "options": ["FCFS", "Round Robin", "Bogo Sort", "SJF"],
      "correctAnswers": ["FCFS", "Round Robin", "SJF"],
      "positiveMarks": 2,
      "negativeMarks": 0
    }
  ]
};

const SSC_SAMPLE_JSON = {
  "examType": "SSC_CGL",
  "questions": [
    {
      "id": 1,
      "type": "MCQ",
      "topic": "Quantitative Aptitude - Algebra",
      "questionText": "If x + 1/x = 5, find x^2 + 1/x^2.",
      "options": ["23", "25", "27", "21"],
      "correctAnswer": "23",
      "positiveMarks": 2,
      "negativeMarks": 0.50
    }
  ]
};

const SAMPLE_TEST: TestData = {
  title: "GATE CS Mock Test - Sample",
  durationMinutes: 180,
  examType: "GATE",
  questions: [
    { id: "q1", text: "Which of the following is TRUE for a standard TCP connection?", type: "MCQ", options: ["Sequence numbers are synonymous with packet numbers.", "It provides full-duplex service.", "The window size is always fixed.", "It does not support flow control."], correctAnswer: "It provides full-duplex service.", marks: 1, negativeMarks: 0.33 },
    { id: "q2", text: "Consider the matrix A with Eigenvalues 2, 4, and 6. What is the determinant of A?", type: "NAT", correctAnswer: "48", marks: 2, negativeMarks: 0 },
    { id: "q3", text: "Which of the following are valid sorting algorithms with O(n log n) worst-case time complexity? (Select all that apply)", type: "MSQ", options: ["Merge Sort", "Quick Sort", "Heap Sort", "Bubble Sort"], correctAnswer: ["Merge Sort", "Heap Sort"], marks: 2, negativeMarks: 0 }
  ]
};

export default function GateSimulator() {
  const [mode, setMode] = useState<'home' | 'creator' | 'instructions' | 'exam' | 'result'>('home');
  const [testData, setTestData] = useState<TestData>(SAMPLE_TEST);
  const [selectedExamId, setSelectedExamId] = useState<string>('GATE');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, QuestionStatus>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiReport, setAiReport] = useState<{ strengths: string[]; weaknesses: string[]; timeManagement: string; actionPlan: string } | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [instructionsChecked, setInstructionsChecked] = useState(false);
  const [calcInput, setCalcInput] = useState("");

  /* --- Timer --- */
  useEffect(() => {
    let t: number;
    if (mode === 'exam' && timeLeft > 0) {
      t = window.setInterval(() => {
        setTimeLeft(p => p <= 1 ? (setMode('result'), 0) : p - 1);
        setResponses(prev => {
          const qId = testData.questions[currentQIndex]?.id;
          if (!qId) return prev;
          return {
            ...prev,
            [qId]: {
              ...prev[qId],
              timeSpentSeconds: (prev[qId]?.timeSpentSeconds || 0) + 1
            }
          };
        });
      }, 1000);
    }
    return () => clearInterval(t);
  }, [mode, timeLeft, currentQIndex, testData.questions]);

  /* --- Actions --- */
  const startExam = () => {
    setTimeLeft(testData.durationMinutes * 60);
    const ir: Record<string, QuestionStatus> = {};
    testData.questions.forEach(q => ir[q.id] = { visited: false, answered: false, markedForReview: false, selectedOption: null, timeSpentSeconds: 0 });
    if (testData.questions.length > 0) ir[testData.questions[0].id].visited = true;
    setResponses(ir);
    setCurrentQIndex(0);
    setMode('exam');
    setSidebarOpen(false);
  };

  const currentQ = testData.questions[currentQIndex];
  const currentStatus = responses[currentQ?.id] || { visited: false, answered: false, markedForReview: false, selectedOption: null, timeSpentSeconds: 0 };

  const updateStatus = (updates: Partial<QuestionStatus>) => setResponses(prev => ({ ...prev, [currentQ.id]: { ...prev[currentQ.id], ...updates } }));

  const canAttemptQuestion = (q: Question, newVal: any) => {
    const isClearing = !newVal || (Array.isArray(newVal) && newVal.length === 0);
    if (isClearing) return true; // always allow clearing a response

    // Check if the question is already attempted, if yes, user can update it
    const s = responses[q.id];
    const isCurrentlyAttempted = s && s.selectedOption != null && s.selectedOption !== '' && (!(Array.isArray(s.selectedOption)) || (s.selectedOption as string[]).length > 0);
    if (isCurrentlyAttempted) return true;

    // Count attempts in current section
    let attemptsInSection = 0;
    if (q.section) {
      testData.questions.forEach(tq => {
        if (tq.section === q.section && (tq.type === q.type || testData.examType === 'NEET')) {
          const ts = responses[tq.id];
          const isAtt = ts && ts.selectedOption != null && ts.selectedOption !== '' && (!(Array.isArray(ts.selectedOption)) || (ts.selectedOption as string[]).length > 0);
          if (isAtt) attemptsInSection++;
        }
      });
    }

    if (testData.examType === 'JEE_MAINS' && q.type === 'NAT' && q.section) {
      if (attemptsInSection >= 5) {
        alert('You can only attempt 5 NAT questions per section in JEE Mains.');
        return false;
      }
    }

    if (testData.examType === 'NEET' && q.section?.includes('Section B')) {
      if (attemptsInSection >= 10) {
        alert('You can only attempt 10 questions in Section B of this subject.');
        return false;
      }
    }

    return true;
  };

  const handleOptionSelect = (val: string) => {
    if (currentQ.type === 'MCQ') {
      if (canAttemptQuestion(currentQ, val)) {
        updateStatus({ selectedOption: val });
      }
    }
    else if (currentQ.type === 'MSQ') {
      const cur = (currentStatus.selectedOption as string[]) || [];
      if (cur.includes(val)) {
        updateStatus({ selectedOption: cur.filter(x => x !== val) });
      } else {
        if (canAttemptQuestion(currentQ, [...cur, val])) {
          updateStatus({ selectedOption: [...cur, val] });
        }
      }
    }
  };

  const handleSaveNext = () => {
    const isAns = currentStatus.selectedOption !== null && currentStatus.selectedOption !== '' && (!(Array.isArray(currentStatus.selectedOption)) || (currentStatus.selectedOption as string[]).length > 0);
    updateStatus({ answered: isAns, markedForReview: false, visited: true });
    if (currentQIndex < testData.questions.length - 1) changeQuestion(currentQIndex + 1);
  };

  const handleMarkReview = () => {
    const isAns = currentStatus.selectedOption !== null && currentStatus.selectedOption !== '' && (!(Array.isArray(currentStatus.selectedOption)) || (currentStatus.selectedOption as string[]).length > 0);
    updateStatus({ markedForReview: true, answered: isAns, visited: true });
    if (currentQIndex < testData.questions.length - 1) changeQuestion(currentQIndex + 1);
  };

  const handleClearResponse = () => updateStatus({ selectedOption: null, answered: false, markedForReview: false });

  const handlePrevious = () => {
    if (currentQIndex > 0) changeQuestion(currentQIndex - 1);
  };

  const changeQuestion = (index: number) => {
    setResponses(prev => {
      const nextQId = testData.questions[index].id;
      return { ...prev, [nextQId]: { ...prev[nextQId], visited: true } };
    });
    setCurrentQIndex(index);
  };

  /* --- Helpers --- */
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getPaletteColor = (qId: string) => {
    const s = responses[qId];
    if (!s) return 'bg-gray-200 text-black';
    if (s.markedForReview && s.answered) return 'bg-purple-600 text-white';
    if (s.markedForReview) return 'bg-purple-600 text-white';
    if (s.answered) return 'bg-green-500 text-white';
    if (!s.answered && s.visited) return 'bg-red-500 text-white';
    return 'bg-gray-200 text-black';
  };

  const computeResult = () => {
    let score = 0, attempted = 0, correct = 0, wrong = 0;
    let positiveMarks = 0, negativeMarks = 0;
    const report = testData.questions.map(q => {
      const resp = responses[q.id];
      const isAttempted = resp?.answered || (resp?.selectedOption != null && resp?.selectedOption !== '' && (!(Array.isArray(resp.selectedOption)) || (resp.selectedOption as string[]).length > 0));
      const timeSpentSeconds = resp?.timeSpentSeconds || 0;
      let isCorrect = false; let marksEarned = 0;
      if (isAttempted) {
        attempted++;
        if (q.type === 'NAT') {
          if (String(resp.selectedOption).trim() === String(q.correctAnswer).trim()) {
            isCorrect = true;
            marksEarned = q.marks;
          } else {
            marksEarned = -q.negativeMarks;
            wrong++;
          }
        } else if (q.type === 'MCQ') {
          if (resp.selectedOption === q.correctAnswer) {
            isCorrect = true;
            marksEarned = q.marks;
          } else {
            marksEarned = -q.negativeMarks;
            wrong++;
          }
        } else if (q.type === 'MSQ') {
          const userArr = (resp.selectedOption as string[]) || [];
          const correctArr = (q.correctAnswer as string[]) || [];

          if (testData.examType === 'JEE_ADVANCED') {
            // Partial Marking Logic
            let hasIncorrect = false;
            let correctSelectedCount = 0;
            userArr.forEach(opt => {
              if (correctArr.includes(opt)) {
                correctSelectedCount++;
              } else {
                hasIncorrect = true;
              }
            });

            if (hasIncorrect) {
              marksEarned = -q.negativeMarks;
              wrong++;
            } else if (correctSelectedCount === correctArr.length && correctSelectedCount > 0) {
              isCorrect = true;
              marksEarned = q.marks;
            } else if (correctSelectedCount > 0) {
              // Partial correct
              marksEarned = correctSelectedCount * 1;
              // We won't mark it "isCorrect" strictly, but marks are awarded
            } else {
              // Should not happen if isAttempted is true, but just in case
              marksEarned = 0;
            }
          } else {
             // Standard marking for MSQ (no partial)
            const userStr = userArr.slice().sort().join(',');
            const correctStr = correctArr.slice().sort().join(',');
            if (userStr === correctStr) {
              isCorrect = true;
              marksEarned = q.marks;
            } else {
               // MSQ doesn't typically have negative marking outside JEE Adv, but if it does:
               marksEarned = -q.negativeMarks;
               wrong++;
            }
          }
        }

        if (marksEarned > 0) {
          if (isCorrect) correct++;
          positiveMarks += marksEarned;
        } else if (marksEarned < 0) {
          negativeMarks += Math.abs(marksEarned);
        }
      }
      score += marksEarned;
      return { ...q, userAnswer: resp?.selectedOption, isCorrect, marksEarned, isAttempted, timeSpentSeconds };
    });

    const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;
    return { score, positiveMarks, negativeMarks, attempted, accuracy, correct, wrong, report };
  };

  const generateAIReport = async (studentData: any) => {
    setIsGeneratingAI(true);
    // In a real app, you would securely call your backend, which then calls:
    // const response = await fetch('https://api.openai.com/v1/chat/completions', { ... })
    // OR Google Gemini API.
    // Here we simulate a 2-second mock generation.

    await new Promise(resolve => setTimeout(resolve, 2000));

    const weakTopics = new Set<string>();
    const strongTopics = new Set<string>();
    let totalTime = 0;

    studentData.report.forEach((item: any) => {
      totalTime += item.timeSpentSeconds || 0;
      if (item.topic) {
        if (item.isAttempted && item.isCorrect) strongTopics.add(item.topic);
        if (item.isAttempted && !item.isCorrect) weakTopics.add(item.topic);
      }
    });

    const mockReport = {
      strengths: strongTopics.size > 0 ? Array.from(strongTopics) : ["Foundations look solid but need more data."],
      weaknesses: weakTopics.size > 0 ? Array.from(weakTopics) : ["No specific weaknesses identified yet."],
      timeManagement: `You spent an average of ${totalTime > 0 && studentData.attempted > 0 ? Math.round(totalTime / studentData.attempted) : 0} seconds per attempted question. Ensure you aren't lingering too long on difficult questions.`,
      actionPlan: "Focus on your weaker topics by practicing more MSQ and NAT types. Review the foundational concepts for any negative-marked questions."
    };

    setAiReport(mockReport);
    setIsGeneratingAI(false);
  };

  /* --- Views --- */
  if (mode === 'home') return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full">
        <h1 className="text-3xl font-extrabold text-blue-900 mb-6 text-center">Exam Simulator</h1>

        <div className="mb-6 p-4 border rounded-lg bg-gray-50 shadow-sm">
          <label className="block text-gray-700 font-bold mb-2">Select Target Exam</label>
          <select
            className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
          >
            {Object.values(EXAM_CONFIGS).map(exam => (
              <option key={exam.id} value={exam.id}>{exam.name} ({exam.durationMinutes} Mins | {exam.totalQuestions} Qs)</option>
            ))}
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="p-6 border-2 border-dashed border-blue-200 rounded-lg cursor-pointer hover:bg-blue-50 transition" onClick={() => setMode('creator')}>
            <div className="flex flex-col items-center">
              <Plus size={32} className="text-blue-500 mb-2" />
              <div className="font-bold text-gray-700">Create Test</div>
              <div className="text-xs text-gray-500 text-center mt-1">Add questions manually and save JSON.</div>
            </div>
          </div>
          <div className="p-6 border-2 border-dashed border-green-200 rounded-lg cursor-pointer hover:bg-green-50 transition relative" onClick={() => document.getElementById('file-upload')?.click()}>
            <div className="flex flex-col items-center">
              <FileJson size={32} className="text-green-500 mb-2" />
              <div className="font-bold text-gray-700">Load Test</div>
              <div className="text-xs text-gray-500 text-center mt-1">Import a JSON test file.</div>
              <input id="file-upload" type="file" accept=".json" className="hidden" onChange={(e: any) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev: any) => {
                    try {
                      const parsed: JsonData = JSON.parse(ev.target.result);

                      if (!selectedExamId.startsWith(parsed.examType)) {
                        alert(`Error: The uploaded JSON is for ${parsed.examType}, but you selected ${selectedExamId}. Please upload the correct JSON.`);
                        return;
                      }

                      const config = EXAM_CONFIGS[selectedExamId];

                      const mappedQuestions: Question[] = parsed.questions.map(q => ({
                        id: String(q.id),
                        text: q.questionText,
                        topic: (q as any).topic,
                        section: q.section,
                        type: q.type,
                        options: q.options,
                        correctAnswer: q.correctAnswer || (q as any).correctAnswers,
                        marks: q.positiveMarks,
                        negativeMarks: q.negativeMarks
                      }));

                      setTestData({
                        title: `${config.name} Mock Test`,
                        durationMinutes: config.durationMinutes,
                        questions: mappedQuestions,
                        examType: parsed.examType
                      });

                      alert('Test Loaded Successfully!');
                    } catch {
                      alert('Invalid JSON File Structure');
                    }
                  };
                  reader.readAsText(file);
                }
              }} />
            </div>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <a
            href={`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(GATE_SAMPLE_JSON, null, 2))}`}
            download="sample_gate_paper.json"
            className="flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded border border-gray-400 transition"
          >
            <Download size={18} className="mr-2" /> Download Sample GATE Paper
          </a>
          <a
            href={`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(SSC_SAMPLE_JSON, null, 2))}`}
            download="sample_ssc_paper.json"
            className="flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded border border-gray-400 transition"
          >
            <Download size={18} className="mr-2" /> Download Sample SSC Paper
          </a>
        </div>

        <div className="bg-gray-100 p-4 rounded-lg">
          <div className="mb-2 text-sm text-gray-500 uppercase tracking-wide font-bold">Current Loaded Test</div>
          <div className="text-lg font-bold text-gray-800">{testData.title}</div>
          <div className="mb-4 text-sm text-gray-600 flex items-center mt-1">
            <span className="bg-gray-200 px-2 py-0.5 rounded text-xs mr-2">{testData.questions.length} Questions</span>
            <span className="bg-gray-200 px-2 py-0.5 rounded text-xs">{testData.durationMinutes} Minutes</span>
          </div>
          <button className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center shadow-md" onClick={() => setMode('instructions')}>
            <Play size={20} className="mr-2" /> Start Exam Now
          </button>
        </div>
      </div>
    </div>
  );

  if (mode === 'instructions') {
    const config = EXAM_CONFIGS[selectedExamId];
    return (
      <div className="min-h-screen p-6 bg-gray-50 flex justify-center">
        <div className="max-w-4xl w-full bg-white p-8 rounded-lg shadow-xl">
          <h1 className="text-2xl font-bold text-gray-800 border-b pb-4 mb-6">General Instructions</h1>

          <div className="h-[60vh] overflow-y-auto pr-4 text-gray-700 space-y-4 mb-6 text-sm">
            <p className="font-bold text-red-600 uppercase">Please read the instructions carefully</p>

            <ol className="list-decimal pl-5 space-y-3">
              <li>Total duration of examination is <b>{config?.durationMinutes || testData.durationMinutes} minutes</b>.</li>
              <li>The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination.</li>
              <li>
                The Question Palette displayed on the right side of screen will show the status of each question using one of the following symbols:
                <ul className="mt-4 space-y-2 list-none pl-0">
                  <li className="flex items-center"><div className="w-5 h-5 bg-gray-200 border rounded-sm mr-3" /> You have not visited the question yet.</li>
                  <li className="flex items-center"><div className="w-5 h-5 bg-red-500 rounded-sm mr-3 text-white flex justify-center items-center font-bold"></div> You have not answered the question.</li>
                  <li className="flex items-center"><div className="w-5 h-5 bg-green-500 rounded-sm mr-3 text-white flex justify-center items-center font-bold"></div> You have answered the question.</li>
                  <li className="flex items-center"><div className="w-5 h-5 bg-purple-600 rounded-sm mr-3 text-white flex justify-center items-center font-bold"></div> You have NOT answered the question, but have marked the question for review.</li>
                  <li className="flex items-center"><div className="w-5 h-5 bg-purple-600 rounded-sm mr-3 relative"><div className="absolute right-0 bottom-0 w-2.5 h-2.5 bg-green-400 rounded-full translate-x-1/2 translate-y-1/2" /></div> The question(s) "Answered and Marked for Review" will be considered for evaluation.</li>
                </ul>
              </li>
              <li>You can click on the "&gt;" arrow which appears to the left of question palette to collapse the question palette thereby maximizing the question window.</li>
              <li>To navigate to a question, click on the question number in the Question Palette.</li>
              <li>To answer a question, do the following:
                <ul className="list-disc pl-5 mt-2">
                  <li>Click on the question number in the Question Palette to go to that question directly.</li>
                  <li>Click on <b>Save & Next</b> to save your answer for the current question and then go to the next question.</li>
                  <li>Click on <b>Mark for Review & Next</b> to save your answer for the current question, mark it for review, and then go to the next question.</li>
                </ul>
              </li>
            </ol>
          </div>

          <div className="border-t pt-4">
            <label className="flex items-start space-x-3 cursor-pointer p-3 bg-gray-50 rounded border hover:bg-gray-100 transition">
              <input
                type="checkbox"
                className="mt-1 w-5 h-5 accent-blue-600"
                checked={instructionsChecked}
                onChange={(e) => setInstructionsChecked(e.target.checked)}
              />
              <span className="text-sm font-semibold text-gray-800">
                I have read and understood the instructions. All computer hardware allotted to me are in proper working condition. I declare that I am not in possession of / not wearing / not carrying any prohibited gadget like mobile phone, bluetooth devices etc.
              </span>
            </label>

            <div className="mt-6 flex justify-between">
              <button className="px-6 py-2 border border-gray-400 text-gray-700 font-bold rounded hover:bg-gray-100 transition" onClick={() => setMode('home')}>
                Cancel
              </button>
              <button
                className={`px-8 py-2 font-bold rounded shadow transition ${instructionsChecked ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                disabled={!instructionsChecked}
                onClick={startExam}
              >
                I am ready to begin
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'creator') return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow-lg">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-gray-800">Test Creator</h2>
          <div className="flex space-x-2">
            <button className="flex items-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition" onClick={() => {
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(testData, null, 2));
              const a = document.createElement('a'); a.href = dataStr; a.download = 'gate_mock_test.json'; document.body.appendChild(a); a.click(); a.remove();
            }}>
              <Download size={16} className="mr-2" /> Save JSON
            </button>
            <button className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition" onClick={() => setMode('home')}>Exit</button>
          </div>
        </div>
        
        <div className="border p-4 rounded bg-blue-50 mb-6">
          <h3 className="font-bold text-blue-900 mb-2">Quick Add</h3>
          <p className="text-sm text-gray-600 mb-3">Add a sample question to test the structure.</p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-blue-700" onClick={() => {
            const q: Question = { id: 'q' + Date.now(), text: 'New sample question text goes here...', type: 'MCQ', options: ['Option A', 'Option B', 'Option C', 'Option D'], correctAnswer: 'Option A', marks: 1, negativeMarks: 0.33 };
            setTestData(prev => ({ ...prev, questions: [...prev.questions, q] }));
          }}>
            <Plus size={16} className="inline mr-1" /> Add Sample MCQ
          </button>
        </div>

        <div>
          <h3 className="font-bold text-gray-700 mb-3">Questions List ({testData.questions.length})</h3>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {testData.questions.map((q, i) => (
              <div key={q.id} className="p-4 border rounded bg-white flex justify-between items-center hover:shadow-sm transition">
                <div className="w-4/5">
                  <div className="font-bold text-sm text-blue-600 mb-1">Q{i + 1} ({q.type}) - {q.marks} Marks</div>
                  <div className="truncate text-gray-700">{q.text}</div>
                </div>
                <button className="text-red-500 p-2 hover:bg-red-50 rounded" onClick={() => setTestData(prev => ({ ...prev, questions: prev.questions.filter(x => x.id !== q.id) }))}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {testData.questions.length === 0 && <div className="text-center text-gray-400 py-8">No questions added yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );

  if (mode === 'exam') return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
      <header className="bg-white px-4 py-2 flex justify-between items-center border-b shadow-sm z-10">
        <div className="font-bold text-lg text-gray-800">GATE Exam Simulator</div>
        <div className="flex items-center space-x-4">
          {['GATE', 'JEE_ADVANCED'].includes(testData.examType) && (
            <button
              className="p-2 text-blue-600 hover:bg-blue-50 rounded transition flex items-center shadow-sm border border-blue-200"
              onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
              title="Virtual Calculator"
            >
              <Calculator size={20} />
            </button>
          )}
          <div className="bg-gray-900 text-white px-4 py-1.5 rounded flex items-center shadow-inner">
            <Clock size={16} className="mr-2 text-yellow-400" />
            <span className="font-mono text-lg tracking-wider">{formatTime(timeLeft)}</span>
          </div>
          <button className="md:hidden p-2 text-gray-600" onClick={() => setSidebarOpen(s => !s)}><Menu /></button>
        </div>
      </header>

      {isCalculatorOpen && (
        <div className="absolute top-16 right-4 md:right-80 bg-white border border-gray-300 shadow-2xl rounded-lg z-50 w-72 flex flex-col overflow-hidden">
          <div className="bg-blue-800 text-white px-3 py-2 text-sm font-bold flex justify-between items-center">
            Virtual Calculator
            <button onClick={() => setIsCalculatorOpen(false)} className="text-white hover:text-red-300">✕</button>
          </div>
          <div className="p-3 bg-gray-100">
            <div className="bg-white border border-gray-300 p-2 text-right text-xl font-mono min-h-[40px] break-all rounded shadow-inner">
              {calcInput || "0"}
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {['7','8','9','/'].map(c => <button key={c} onClick={() => setCalcInput(p => p+c)} className="bg-white border rounded p-2 font-bold hover:bg-gray-50">{c}</button>)}
              {['4','5','6','*'].map(c => <button key={c} onClick={() => setCalcInput(p => p+c)} className="bg-white border rounded p-2 font-bold hover:bg-gray-50">{c}</button>)}
              {['1','2','3','-'].map(c => <button key={c} onClick={() => setCalcInput(p => p+c)} className="bg-white border rounded p-2 font-bold hover:bg-gray-50">{c}</button>)}
              {['0','.','C','+'].map(c =>
                <button
                  key={c}
                  onClick={() => c === 'C' ? setCalcInput('') : setCalcInput(p => p+c)}
                  className={`bg-white border rounded p-2 font-bold hover:bg-gray-50 ${c==='C' ? 'text-red-600' : ''}`}
                >
                  {c}
                </button>
              )}
              <button
                className="col-span-4 bg-blue-600 text-white border rounded p-2 font-bold hover:bg-blue-700 mt-1"
                onClick={() => {
                  try {
                    // Using a simple Function constructor to evaluate safely-ish (still better than eval)
                    setCalcInput(String(new Function('return ' + calcInput)()));
                  } catch {
                    setCalcInput('Error');
                  }
                }}
              >
                =
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-2 flex justify-between items-center shadow-md shrink-0">
            <div className="font-semibold text-lg">Question {currentQIndex + 1} {currentQ.section && `- ${currentQ.section}`}</div>
            <div className="flex items-center space-x-3">
              <div className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full border border-white/30">
                Marks: {currentQ.marks} <span className="mx-1">|</span> Neg: <span className="text-red-200">-{currentQ.negativeMarks}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-white">
            <div className="max-w-5xl mx-auto">
              <div className="text-lg md:text-xl mb-8 leading-relaxed text-gray-800 border-b pb-6">{currentQ.text}</div>
              <div className="space-y-4">
                {currentQ.type === 'NAT' ? (
                  <div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed border-gray-300">
                    <label className="font-bold block mb-3 text-gray-700">Enter Numerical Answer:</label>
                    <input
                      type="text"
                      className="border-2 border-gray-300 p-3 rounded w-full md:w-64 font-mono text-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                      placeholder="0.00"
                      value={(currentStatus.selectedOption as string) || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (canAttemptQuestion(currentQ, val)) {
                          updateStatus({ selectedOption: val });
                        }
                      }}
                    />
                  </div>
                ) : (
                  currentQ.options?.map((opt,jh) => {
                    const isSelected = currentQ.type === 'MCQ'
                      ? currentStatus.selectedOption === opt
                      : (currentStatus.selectedOption as string[])?.includes(opt);
                    return (
                      <div
                        key={jh}
                        onClick={() => handleOptionSelect(opt)}
                        className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${isSelected ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
                      >
                        <div className={`w-6 h-6 mr-4 mt-0.5 border-2 flex-shrink-0 flex items-center justify-center ${currentQ.type === 'MCQ' ? 'rounded-full' : 'rounded'} ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-400 bg-white'}`}>
                          {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                        </div>
                        <span className="text-gray-800 text-lg">{opt}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-100 p-3 border-t flex justify-between items-center shrink-0">
            <div className="flex space-x-2">
              <button className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded hover:bg-purple-700 transition" onClick={handleMarkReview}>Mark for Review & Next</button>
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded hover:bg-gray-50 transition" onClick={handleClearResponse}>Clear Response</button>
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded hover:bg-gray-50 transition" onClick={handlePrevious} disabled={currentQIndex === 0}>Previous</button>
            </div>
            <button className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded flex items-center hover:bg-blue-700 transition shadow-sm" onClick={handleSaveNext}>
              Save & Next <ChevronRight size={18} className="ml-1" />
            </button>
          </div>
        </main>

        <aside className={`absolute md:relative right-0 top-0 h-full w-80 bg-blue-50 border-l shadow-xl md:shadow-none z-20 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} flex flex-col`}>
          <div className="p-4 bg-white border-b">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full mr-3 flex items-center justify-center text-gray-500 font-bold text-xl">JD</div>
              <div>
                <div className="font-bold text-gray-800">John Doe</div>
                <div className="text-xs text-gray-500 uppercase font-semibold">Candidate</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-gray-600">
              <div className="flex items-center"><div className="w-3 h-3 bg-green-500 rounded-sm mr-1.5" /> Answered</div>
              <div className="flex items-center"><div className="w-3 h-3 bg-red-500 rounded-sm mr-1.5" /> Not Answered</div>
              <div className="flex items-center"><div className="w-3 h-3 bg-gray-200 rounded-sm mr-1.5 border" /> Not Visited</div>
              <div className="flex items-center"><div className="w-3 h-3 bg-purple-600 rounded-sm mr-1.5" /> Marked for Review</div>
              <div className="flex items-center col-span-2 mt-1 relative"><div className="w-3 h-3 bg-purple-600 rounded-sm mr-1.5 relative"><div className="absolute right-0 bottom-0 w-1.5 h-1.5 bg-green-400 rounded-full translate-x-1/2 translate-y-1/2" /></div> Answered & Marked for Review</div>
            </div>
          </div>

          <div className="p-2 overflow-y-auto flex-1 bg-white/50">
            <h3 className="font-bold text-gray-700 mb-2 px-2 text-sm uppercase">Question Palette</h3>
            <div className="grid grid-cols-4 gap-2 px-2">
              {testData.questions.map((q, idx) => {
                const isAnsAndRev = responses[q.id]?.markedForReview && responses[q.id]?.answered;
                return (
                  <button
                    key={q.id}
                    onClick={() => changeQuestion(idx)}
                    className={`relative h-9 w-full rounded flex items-center justify-center text-sm font-bold border transition-all ${getPaletteColor(q.id)} ${currentQIndex === idx ? 'ring-2 ring-blue-500 ring-offset-1 z-10' : ''}`}
                  >
                    {idx + 1}
                    {isAnsAndRev && <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border border-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 bg-white border-t">
            <button className="w-full bg-teal-600 text-white py-2.5 rounded font-bold hover:bg-teal-700 shadow transition" onClick={() => { if (window.confirm('Are you sure you want to submit the exam?')) setMode('result'); }}>
              Submit Exam
            </button>
          </div>
        </aside>
      </div>
    </div>
  );

  if (mode === 'result') {
    const { score, positiveMarks, negativeMarks, attempted, accuracy, correct, wrong, report } = computeResult();
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex justify-center">
        <div className="max-w-5xl w-full bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
          <div className="bg-blue-800 text-white p-8">
            <h1 className="text-3xl font-bold mb-2">Exam Result</h1>
            <div className="text-blue-200 text-lg">{testData.title}</div>
          </div>
          <div className="p-8 flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-10">
              <div className="bg-blue-50 p-6 rounded-lg text-center border border-blue-100">
                <div className="text-4xl font-extrabold text-blue-700 mb-1">{score.toFixed(2)}</div>
                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Marks</div>
              </div>
              <div className="bg-green-50 p-6 rounded-lg text-center border border-green-100">
                <div className="text-4xl font-extrabold text-green-700 mb-1">+{positiveMarks.toFixed(2)}</div>
                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Positive Marks</div>
              </div>
              <div className="bg-red-50 p-6 rounded-lg text-center border border-red-100">
                <div className="text-4xl font-extrabold text-red-700 mb-1">-{negativeMarks.toFixed(2)}</div>
                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Negative Marks</div>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg text-center border border-gray-200">
                <div className="text-4xl font-extrabold text-gray-700 mb-1">{attempted}</div>
                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Attempted</div>
              </div>
              <div className="bg-purple-50 p-6 rounded-lg text-center border border-purple-200">
                <div className="text-4xl font-extrabold text-purple-700 mb-1">{accuracy.toFixed(1)}%</div>
                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Accuracy</div>
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Detailed Analysis</h2>
            <div className="space-y-4">
              {report.map((item, idx) => (
                <div key={item.id} className={`border rounded-lg p-5 ${!item.isAttempted ? 'border-gray-200 bg-gray-50' : item.isCorrect ? 'border-green-200 bg-green-50/20' : 'border-red-200 bg-red-50/20'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-bold text-gray-700">Q{idx + 1}. <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded ml-1 text-gray-600">{item.type}</span></span>
                    <span className={`font-bold px-2 py-1 rounded text-sm ${!item.isAttempted ? 'bg-gray-200 text-gray-700' : item.marksEarned >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {item.isAttempted ? (item.marksEarned > 0 ? '+' : '') + item.marksEarned.toFixed(2) + ' Marks' : 'Not Attempted'}
                    </span>
                  </div>
                  <p className="mb-4 text-gray-800">{item.text}</p>
                  <div className="grid md:grid-cols-2 gap-4 text-sm bg-white p-3 rounded border border-gray-100">
                    <div>
                      <span className="font-semibold block text-gray-500 mb-1">Your Answer:</span>
                      <div className={`font-medium ${item.isAttempted && item.userAnswer ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                        {item.isAttempted && item.userAnswer ? (Array.isArray(item.userAnswer) ? item.userAnswer.join(', ') : item.userAnswer) : 'Not Attempted'}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold block text-gray-500 mb-1">Correct Answer:</span>
                      <div className="font-medium text-green-700">
                        {Array.isArray(item.correctAnswer) ? item.correctAnswer.join(', ') : item.correctAnswer}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 border-t pt-8">
              {!aiReport && !isGeneratingAI && (
                <div className="text-center">
                  <button
                    onClick={() => generateAIReport({ score, positiveMarks, negativeMarks, attempted, accuracy, correct, wrong, report })}
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-indigo-700 transition shadow-xl text-lg flex items-center justify-center mx-auto"
                  >
                    Generate AI Performance Analysis
                  </button>
                </div>
              )}

              {isGeneratingAI && (
                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                  <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <div className="text-indigo-600 font-semibold animate-pulse">AI is analyzing your performance...</div>
                </div>
              )}

              {aiReport && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 rounded-xl border border-indigo-100 shadow-md">
                  <h3 className="text-2xl font-bold text-indigo-900 mb-6 flex items-center">
                    <span className="bg-indigo-600 text-white w-8 h-8 flex items-center justify-center rounded-lg mr-3 text-sm">AI</span>
                    Performance Insights
                  </h3>

                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white p-5 rounded-lg border border-green-100 shadow-sm">
                      <h4 className="font-bold text-green-700 mb-2 uppercase text-sm tracking-wider">Top Strengths</h4>
                      <ul className="list-disc pl-5 text-gray-700 space-y-1">
                        {aiReport.strengths.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                    <div className="bg-white p-5 rounded-lg border border-red-100 shadow-sm">
                      <h4 className="font-bold text-red-700 mb-2 uppercase text-sm tracking-wider">Learning Gaps</h4>
                      <ul className="list-disc pl-5 text-gray-700 space-y-1">
                        {aiReport.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-lg border border-yellow-100 shadow-sm mb-6">
                    <h4 className="font-bold text-yellow-700 mb-2 uppercase text-sm tracking-wider">Time Management</h4>
                    <p className="text-gray-700">{aiReport.timeManagement}</p>
                  </div>

                  <div className="bg-white p-5 rounded-lg border border-blue-100 shadow-sm">
                    <h4 className="font-bold text-blue-700 mb-2 uppercase text-sm tracking-wider">Action Plan</h4>
                    <p className="text-gray-700 font-medium">{aiReport.actionPlan}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-10 flex justify-end">
              <button className="px-8 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition shadow-lg" onClick={() => { setMode('home'); setAiReport(null); setIsGeneratingAI(false); }}>
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}