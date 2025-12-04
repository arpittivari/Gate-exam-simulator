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
  Upload
} from 'lucide-react';

/* --- Types --- */
type QuestionType = 'MCQ' | 'MSQ' | 'NAT';

interface Question {
  id: string;
  text: string;
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
}

interface TestData {
  title: string;
  durationMinutes: number;
  questions: Question[];
}

/* --- Sample Data --- */
const SAMPLE_TEST: TestData = {
  title: "GATE CS Mock Test - Sample",
  durationMinutes: 180,
  questions: [
    { id: "q1", text: "Which of the following is TRUE for a standard TCP connection?", type: "MCQ", options: ["Sequence numbers are synonymous with packet numbers.", "It provides full-duplex service.", "The window size is always fixed.", "It does not support flow control."], correctAnswer: "It provides full-duplex service.", marks: 1, negativeMarks: 0.33 },
    { id: "q2", text: "Consider the matrix A with Eigenvalues 2, 4, and 6. What is the determinant of A?", type: "NAT", correctAnswer: "48", marks: 2, negativeMarks: 0 },
    { id: "q3", text: "Which of the following are valid sorting algorithms with O(n log n) worst-case time complexity? (Select all that apply)", type: "MSQ", options: ["Merge Sort", "Quick Sort", "Heap Sort", "Bubble Sort"], correctAnswer: ["Merge Sort", "Heap Sort"], marks: 2, negativeMarks: 0 }
  ]
};

export default function GateSimulator() {
  const [mode, setMode] = useState<'home' | 'creator' | 'exam' | 'result'>('home');
  const [testData, setTestData] = useState<TestData>(SAMPLE_TEST);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, QuestionStatus>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  /* --- Timer --- */
  useEffect(() => {
    let t: number;
    if (mode === 'exam' && timeLeft > 0) {
      t = window.setInterval(() => setTimeLeft(p => p <= 1 ? (setMode('result'), 0) : p - 1), 1000);
    }
    return () => clearInterval(t);
  }, [mode, timeLeft]);

  /* --- Actions --- */
  const startExam = () => {
    setTimeLeft(testData.durationMinutes * 60);
    const ir: Record<string, QuestionStatus> = {};
    testData.questions.forEach(q => ir[q.id] = { visited: false, answered: false, markedForReview: false, selectedOption: null });
    if (testData.questions.length > 0) ir[testData.questions[0].id].visited = true;
    setResponses(ir);
    setCurrentQIndex(0);
    setMode('exam');
    setSidebarOpen(false);
  };

  const currentQ = testData.questions[currentQIndex];
  const currentStatus = responses[currentQ?.id] || { visited: false, answered: false, markedForReview: false, selectedOption: null };

  const updateStatus = (updates: Partial<QuestionStatus>) => setResponses(prev => ({ ...prev, [currentQ.id]: { ...prev[currentQ.id], ...updates } }));

  const handleOptionSelect = (val: string) => {
    if (currentQ.type === 'MCQ') updateStatus({ selectedOption: val });
    else if (currentQ.type === 'MSQ') {
      const cur = (currentStatus.selectedOption as string[]) || [];
      if (cur.includes(val)) updateStatus({ selectedOption: cur.filter(x => x !== val) });
      else updateStatus({ selectedOption: [...cur, val] });
    }
  };

  const handleSaveNext = () => {
    const isAns = currentStatus.selectedOption !== null && currentStatus.selectedOption !== '' && (!(Array.isArray(currentStatus.selectedOption)) || (currentStatus.selectedOption as string[]).length > 0);
    updateStatus({ answered: isAns, visited: true });
    if (currentQIndex < testData.questions.length - 1) changeQuestion(currentQIndex + 1);
  };

  const handleMarkReview = () => {
    const isAns = currentStatus.selectedOption !== null && currentStatus.selectedOption !== '' && (!(Array.isArray(currentStatus.selectedOption)) || (currentStatus.selectedOption as string[]).length > 0);
    updateStatus({ markedForReview: true, answered: isAns, visited: true });
    if (currentQIndex < testData.questions.length - 1) changeQuestion(currentQIndex + 1);
  };

  const handleClearResponse = () => updateStatus({ selectedOption: null, answered: false });

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
    const report = testData.questions.map(q => {
      const resp = responses[q.id];
      const isAttempted = resp?.answered || (resp?.selectedOption != null && resp?.selectedOption !== '');
      let isCorrect = false; let marksEarned = 0;
      if (isAttempted) {
        attempted++;
        if (q.type === 'NAT') {
          if (String(resp.selectedOption).trim() === String(q.correctAnswer).trim()) { isCorrect = true; marksEarned = q.marks; }
        } else if (q.type === 'MCQ') {
          if (resp.selectedOption === q.correctAnswer) { isCorrect = true; marksEarned = q.marks; } else { marksEarned = -q.negativeMarks; wrong++; }
        } else if (q.type === 'MSQ') {
          const userArr = (resp.selectedOption as string[])?.sort().join(',') || '';
          const correctArr = (q.correctAnswer as string[])?.sort().join(',') || '';
          if (userArr === correctArr) { isCorrect = true; marksEarned = q.marks; }
        }
        if (isCorrect) correct++;
      }
      score += marksEarned;
      return { ...q, userAnswer: resp?.selectedOption, isCorrect, marksEarned };
    });
    return { score, attempted, correct, wrong, report };
  };

  /* --- Views --- */
  if (mode === 'home') return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full">
        <h1 className="text-3xl font-extrabold text-blue-900 mb-6 text-center">GATE Exam Simulator</h1>
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
                    try { setTestData(JSON.parse(ev.target.result)); alert('Test Loaded Successfully!'); } catch { alert('Invalid JSON File'); }
                  };
                  reader.readAsText(file);
                }
              }} />
            </div>
          </div>
        </div>
        <div className="bg-gray-100 p-4 rounded-lg">
          <div className="mb-2 text-sm text-gray-500 uppercase tracking-wide font-bold">Current Loaded Test</div>
          <div className="text-lg font-bold text-gray-800">{testData.title}</div>
          <div className="mb-4 text-sm text-gray-600 flex items-center mt-1">
            <span className="bg-gray-200 px-2 py-0.5 rounded text-xs mr-2">{testData.questions.length} Questions</span>
            <span className="bg-gray-200 px-2 py-0.5 rounded text-xs">{testData.durationMinutes} Minutes</span>
          </div>
          <button className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center shadow-md" onClick={startExam}>
            <Play size={20} className="mr-2" /> Start Exam Now
          </button>
        </div>
      </div>
    </div>
  );

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
          <div className="bg-gray-900 text-white px-4 py-1.5 rounded flex items-center shadow-inner">
            <Clock size={16} className="mr-2 text-yellow-400" />
            <span className="font-mono text-lg tracking-wider">{formatTime(timeLeft)}</span>
          </div>
          <button className="md:hidden p-2 text-gray-600" onClick={() => setSidebarOpen(s => !s)}><Menu /></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-2 flex justify-between items-center shadow-md shrink-0">
            <div className="font-semibold text-lg">Question {currentQIndex + 1}</div>
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
                      onChange={(e) => updateStatus({ selectedOption: e.target.value })}
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
              <div className="flex items-center"><div className="w-3 h-3 bg-purple-600 rounded-sm mr-1.5" /> Review</div>
            </div>
          </div>

          <div className="p-2 overflow-y-auto flex-1 bg-white/50">
            <h3 className="font-bold text-gray-700 mb-2 px-2 text-sm uppercase">Question Palette</h3>
            <div className="grid grid-cols-4 gap-2 px-2">
              {testData.questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => changeQuestion(idx)}
                  className={`h-9 w-full rounded flex items-center justify-center text-sm font-bold border transition-all ${getPaletteColor(q.id)} ${currentQIndex === idx ? 'ring-2 ring-blue-500 ring-offset-1 z-10' : ''}`}
                >
                  {idx + 1}
                </button>
              ))}
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
    const { score, attempted, correct, wrong, report } = computeResult();
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex justify-center">
        <div className="max-w-5xl w-full bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
          <div className="bg-blue-800 text-white p-8">
            <h1 className="text-3xl font-bold mb-2">Exam Result</h1>
            <div className="text-blue-200 text-lg">{testData.title}</div>
          </div>
          <div className="p-8 flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
              <div className="bg-blue-50 p-6 rounded-lg text-center border border-blue-100">
                <div className="text-4xl font-extrabold text-blue-700 mb-1">{score.toFixed(2)}</div>
                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Score</div>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg text-center border border-gray-200">
                <div className="text-4xl font-extrabold text-gray-700 mb-1">{testData.questions.length}</div>
                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Questions</div>
              </div>
              <div className="bg-green-50 p-6 rounded-lg text-center border border-green-100">
                <div className="text-4xl font-extrabold text-green-700 mb-1">{correct}</div>
                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Correct</div>
              </div>
              <div className="bg-red-50 p-6 rounded-lg text-center border border-red-100">
                <div className="text-4xl font-extrabold text-red-700 mb-1">{wrong}</div>
                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Wrong</div>
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Detailed Analysis</h2>
            <div className="space-y-4">
              {report.map((item, idx) => (
                <div key={item.id} className={`border rounded-lg p-5 ${item.isCorrect ? 'border-green-200 bg-green-50/20' : 'border-red-200 bg-red-50/20'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-bold text-gray-700">Q{idx + 1}. <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded ml-1 text-gray-600">{item.type}</span></span>
                    <span className={`font-bold px-2 py-1 rounded text-sm ${item.marksEarned >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {item.marksEarned > 0 ? '+' : ''}{item.marksEarned.toFixed(2)} Marks
                    </span>
                  </div>
                  <p className="mb-4 text-gray-800">{item.text}</p>
                  <div className="grid md:grid-cols-2 gap-4 text-sm bg-white p-3 rounded border border-gray-100">
                    <div>
                      <span className="font-semibold block text-gray-500 mb-1">Your Answer:</span>
                      <div className={`font-medium ${item.userAnswer ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                        {item.userAnswer ? (Array.isArray(item.userAnswer) ? item.userAnswer.join(', ') : item.userAnswer) : 'Not Attempted'}
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
            <div className="mt-10 flex justify-end">
              <button className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-lg" onClick={() => setMode('home')}>
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