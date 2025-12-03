import React, { useState, useEffect, useRef } from 'react';
import {
  Calculator,
  ChevronRight,
  Clock,
  FileText,
  Play,
  Menu,
  X,
  Upload,
  Settings,
  AlertCircle
} from 'lucide-react';

/* --- Types --- */
type QuestionType = 'MCQ' | 'MSQ' | 'NAT';

interface QuestionConfig {
  id: number;
  type: QuestionType;
  marks: number;
  negative: number;
}

interface QuestionStatus {
  visited: boolean;
  answered: boolean;
  markedForReview: boolean;
  selectedOption: string | string[] | null;
}

/* --- Constants --- */
const TOTAL_QUESTIONS = 65;
const DEFAULT_DURATION = 180; // 3 hours

/* --- Calculator Component --- */
const ScientificCalculator = ({ onClose }: { onClose: () => void }) => {
  const [display, setDisplay] = useState("0");
  const handleBtn = (v: string) => {
    if (v === 'C') setDisplay("0");
    else if (v === '=') {
      try {
        // eslint-disable-next-line no-new-func
        const r = new Function('return ' + display)();
        setDisplay(String(r));
      } catch {
        setDisplay("Error");
      }
    } else setDisplay(display === "0" ? v : display + v);
  };
  return (
    <div className="fixed top-20 left-10 bg-gray-200 border-2 border-gray-600 w-64 shadow-2xl z-50 rounded-t-lg select-none">
      <div className="bg-blue-800 text-white p-1 flex justify-between items-center cursor-move">
        <span className="text-xs font-bold pl-2">Scientific Calculator</span>
        <button onClick={onClose} className="p-1 hover:bg-red-500 rounded"><X size={14} /></button>
      </div>
      <div className="p-2">
        <input className="w-full mb-2 text-right p-2 border border-gray-400 bg-white font-mono" value={display} readOnly />
        <div className="grid grid-cols-4 gap-1">
          {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '=', '+'].map(b => (
            <button key={b} onClick={() => handleBtn(b)} className="bg-gray-100 border border-gray-400 p-2 text-sm hover:bg-gray-300 active:bg-gray-400 font-bold">
              {b}
            </button>
          ))}
          <button onClick={() => handleBtn('C')} className="col-span-4 bg-red-100 border border-red-400 p-1 text-sm mt-1 hover:bg-red-200 font-bold">Clear</button>
        </div>
      </div>
    </div>
  );
};

export default function GateSimulator() {
  const [mode, setMode] = useState<'home' | 'exam' | 'result'>('home');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  
  // Exam State
  const [questions, setQuestions] = useState<QuestionConfig[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [responses, setResponses] = useState<Record<number, QuestionStatus>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [showCalc, setShowCalc] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // Timer
  useEffect(() => {
    let timer: number;
    if (mode === 'exam' && timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            submitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mode, timeLeft]);

  /* --- Initialization --- */
  const initializeExam = (file: File) => {
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    
    // Generate default GATE structure (65 Qs)
    // Q1-5: 1 Mark MCQ (GA)
    // Q6-10: 2 Mark MCQ (GA)
    // Q11-35: 1 Mark (Subject)
    // Q36-65: 2 Mark (Subject)
    const newQs: QuestionConfig[] = [];
    for (let i = 1; i <= TOTAL_QUESTIONS; i++) {
      let marks = 1;
      let neg = 0.33;
      if (i >= 6 && i <= 10) { marks = 2; neg = 0.66; }
      if (i >= 36) { marks = 2; neg = 0.66; }
      
      newQs.push({
        id: i,
        type: 'MCQ', // Default to MCQ, user can change during exam if needed
        marks,
        negative: neg
      });
    }
    setQuestions(newQs);
    
    const initResp: Record<number, QuestionStatus> = {};
    newQs.forEach(q => {
      initResp[q.id] = { visited: false, answered: false, markedForReview: false, selectedOption: null };
    });
    initResp[1].visited = true;
    setResponses(initResp);
    
    setTimeLeft(DEFAULT_DURATION * 60);
    setMode('exam');
  };

  const submitExam = () => setMode('result');

  /* --- Helpers --- */
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentQ = questions[currentQIndex];
  const currentStatus = responses[currentQ?.id] || { visited: false, answered: false, markedForReview: false, selectedOption: null };

  const updateStatus = (updates: Partial<QuestionStatus>) => {
    setResponses(prev => ({
      ...prev,
      [currentQ.id]: { ...prev[currentQ.id], ...updates }
    }));
  };

  // Change question type on the fly (since PDF doesn't tell us)
  const changeQuestionType = (type: QuestionType) => {
    const newQs = [...questions];
    newQs[currentQIndex].type = type;
    if (type === 'MSQ' || type === 'NAT') newQs[currentQIndex].negative = 0; // No neg marks for MSQ/NAT usually
    else {
        // Restore negative marks for MCQ
        newQs[currentQIndex].negative = newQs[currentQIndex].marks === 1 ? 0.33 : 0.66;
    }
    setQuestions(newQs);
    // Clear response when type changes to avoid type mismatch
    updateStatus({ selectedOption: null, answered: false });
  };

  const handleOptionSelect = (val: string) => {
    if (currentQ.type === 'MCQ') {
      updateStatus({ selectedOption: val });
    } else if (currentQ.type === 'MSQ') {
      const cur = (currentStatus.selectedOption as string[]) || [];
      if (cur.includes(val)) updateStatus({ selectedOption: cur.filter(x => x !== val) });
      else updateStatus({ selectedOption: [...cur, val] });
    }
  };

  const handleSaveNext = () => {
    const hasAns = currentStatus.selectedOption !== null && currentStatus.selectedOption !== '' && 
                   (!Array.isArray(currentStatus.selectedOption) || currentStatus.selectedOption.length > 0);
    updateStatus({ answered: hasAns, visited: true });
    if (currentQIndex < questions.length - 1) changeQuestion(currentQIndex + 1);
  };

  const handleMarkReview = () => {
    const hasAns = currentStatus.selectedOption !== null && currentStatus.selectedOption !== '' && 
                   (!Array.isArray(currentStatus.selectedOption) || currentStatus.selectedOption.length > 0);
    updateStatus({ markedForReview: true, answered: hasAns, visited: true });
    if (currentQIndex < questions.length - 1) changeQuestion(currentQIndex + 1);
  };

  const changeQuestion = (index: number) => {
    setResponses(prev => {
      const nextId = questions[index].id;
      return { ...prev, [nextId]: { ...prev[nextId], visited: true } };
    });
    setCurrentQIndex(index);
  };

  const getPaletteColor = (qId: number) => {
    const s = responses[qId];
    if (!s) return 'bg-gray-200 text-black';
    if (s.markedForReview && s.answered) return 'bg-purple-600 text-white border-4 border-green-400';
    if (s.markedForReview) return 'bg-purple-600 text-white';
    if (s.answered) return 'bg-green-500 text-white';
    if (!s.answered && s.visited) return 'bg-red-500 text-white';
    return 'bg-gray-200 text-black';
  };

  /* --- Views --- */

  if (mode === 'home') return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl w-full text-center">
        <div className="mb-6 flex justify-center">
             <div className="bg-blue-100 p-4 rounded-full">
                 <FileText size={48} className="text-blue-600" />
             </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">GATE PDF Exam Simulator</h1>
        <p className="text-gray-600 mb-8">
          Practice directly with your question paper PDFs. The app provides the timer, calculator, and answer sheet logic.
        </p>

        <div className="border-2 border-dashed border-blue-300 rounded-lg p-10 hover:bg-blue-50 transition cursor-pointer relative"
             onClick={() => document.getElementById('pdf-upload')?.click()}>
            <input 
                type="file" 
                id="pdf-upload" 
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                    if (e.target.files?.[0]) initializeExam(e.target.files[0]);
                }}
            />
            <div className="flex flex-col items-center text-blue-600">
                <Upload size={32} className="mb-2" />
                <span className="font-semibold text-lg">Click to Upload Question Paper (PDF)</span>
                <span className="text-sm text-gray-500 mt-1">Supports any GATE/Mock Test PDF</span>
            </div>
        </div>

        <div className="mt-6 text-sm text-gray-400">
            Note: This works locally in your browser. Your PDF is not uploaded to any server.
        </div>
      </div>
    </div>
  );

  if (mode === 'exam') return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b h-14 flex items-center justify-between px-4 shrink-0 shadow-sm z-20">
            <div className="font-bold text-lg text-gray-800 flex items-center">
                <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm mr-2">GATE 2024</span>
                Simulator
            </div>
            <div className="flex items-center space-x-4">
                <div className="flex items-center bg-gray-900 text-white px-3 py-1.5 rounded shadow-inner">
                    <Clock size={16} className="mr-2 text-yellow-400" />
                    <span className="font-mono text-lg tracking-wider">{formatTime(timeLeft)}</span>
                </div>
                <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 bg-gray-100 rounded">
                    <Menu size={20} />
                </button>
            </div>
        </header>

        {/* Main Body */}
        <div className="flex flex-1 overflow-hidden relative">
            
            {/* LEFT PANEL: PDF Viewer */}
            <div className="w-1/2 md:w-7/12 lg:w-2/3 h-full border-r bg-gray-500 overflow-hidden relative">
                {pdfUrl ? (
                    <object data={pdfUrl} type="application/pdf" className="w-full h-full">
                        <div className="flex items-center justify-center h-full text-white">
                            <p>Your browser does not support embedding PDFs. Please download it to view.</p>
                        </div>
                    </object>
                ) : (
                    <div className="flex items-center justify-center h-full text-white">Loading PDF...</div>
                )}
            </div>

            {/* RIGHT PANEL: Answer Sheet */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden w-1/2 md:w-5/12 lg:w-1/3">
                {/* Question Control Header */}
                <div className="bg-blue-50 border-b p-3">
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-lg text-blue-900">Question No. {currentQ.id}</span>
                        <div className="flex space-x-2">
                            <button onClick={() => setShowCalc(!showCalc)} className="text-xs flex items-center bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50">
                                <Calculator size={12} className="mr-1"/> Calc
                            </button>
                            <button title="Report Issue" className="text-gray-400 hover:text-red-500"><AlertCircle size={18}/></button>
                        </div>
                    </div>
                    
                    {/* Settings Row */}
                    <div className="flex justify-between items-center bg-white p-2 rounded border border-blue-100 text-xs">
                        <div className="flex items-center space-x-2">
                             <span className="text-gray-500">Type:</span>
                             <select 
                                value={currentQ.type} 
                                onChange={(e) => changeQuestionType(e.target.value as QuestionType)}
                                className="border rounded p-1 font-semibold text-blue-700 outline-none focus:ring-1"
                             >
                                 <option value="MCQ">MCQ</option>
                                 <option value="MSQ">MSQ</option>
                                 <option value="NAT">NAT</option>
                             </select>
                        </div>
                        <div className="flex space-x-2 text-gray-500">
                            <span>Marks: <strong>{currentQ.marks}</strong></span>
                            <span>Neg: <strong className="text-red-500">-{currentQ.negative}</strong></span>
                        </div>
                    </div>
                </div>

                {/* Answer Area */}
                <div className="flex-1 p-6 overflow-y-auto">
                    <h3 className="text-gray-500 font-semibold mb-4 uppercase text-sm tracking-wide">Select your answer</h3>
                    
                    <div className="space-y-4">
                        {currentQ.type === 'NAT' ? (
                             <div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed border-gray-300 text-center">
                                <label className="block text-gray-600 mb-2 font-medium">Enter Numerical Value</label>
                                <input 
                                    type="text" 
                                    className="w-full text-center text-2xl font-mono p-3 border-2 border-blue-300 rounded focus:border-blue-600 outline-none"
                                    placeholder="0.00"
                                    value={(currentStatus.selectedOption as string) || ''}
                                    onChange={(e) => updateStatus({ selectedOption: e.target.value })}
                                />
                             </div>
                        ) : (
                             <div className="grid grid-cols-1 gap-3">
                                 {['A', 'B', 'C', 'D'].map((opt) => {
                                     const isSelected = currentQ.type === 'MCQ' 
                                        ? currentStatus.selectedOption === opt 
                                        : (currentStatus.selectedOption as string[])?.includes(opt);
                                     
                                     return (
                                        <div 
                                            key={opt}
                                            onClick={() => handleOptionSelect(opt)}
                                            className={`
                                                flex items-center p-4 rounded-lg cursor-pointer border-2 transition-all
                                                ${isSelected 
                                                    ? 'border-blue-600 bg-blue-50 shadow-md' 
                                                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}
                                            `}
                                        >
                                            <div className={`
                                                w-8 h-8 rounded-full flex items-center justify-center font-bold mr-4 text-sm
                                                ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}
                                            `}>
                                                {opt}
                                            </div>
                                            <span className="font-medium text-gray-700">Option {opt}</span>
                                        </div>
                                     );
                                 })}
                             </div>
                        )}
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-3 border-t bg-gray-50 flex flex-wrap gap-2 justify-between">
                     <div className="flex gap-2">
                        <button onClick={handleMarkReview} className="px-3 py-2 bg-purple-100 text-purple-700 border border-purple-200 rounded font-semibold hover:bg-purple-200 text-xs">Mark for Review</button>
                        <button onClick={() => updateStatus({ selectedOption: null, answered: false })} className="px-3 py-2 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-100 text-xs">Clear</button>
                     </div>
                     <button onClick={handleSaveNext} className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow-sm flex items-center text-sm">
                        Save & Next
                     </button>
                </div>
            </div>

            {/* Sidebar Palette (Collapsible) */}
            <div className={`
                absolute md:relative right-0 top-0 h-full w-72 bg-white border-l shadow-xl md:shadow-none z-30 transform transition-transform duration-300
                ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0 hidden md:flex flex-col'}
            `}>
                <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                    <span className="font-bold text-gray-700">Question Palette</span>
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-500"><X size={20}/></button>
                </div>

                {/* Legend */}
                <div className="p-2 grid grid-cols-2 gap-2 text-[10px] bg-white border-b">
                   <div className="flex items-center"><span className="w-3 h-3 bg-green-500 rounded mr-1"></span> Answered</div>
                   <div className="flex items-center"><span className="w-3 h-3 bg-red-500 rounded mr-1"></span> Not Answered</div>
                   <div className="flex items-center"><span className="w-3 h-3 bg-purple-600 rounded mr-1"></span> Review</div>
                   <div className="flex items-center"><span className="w-3 h-3 bg-gray-200 rounded mr-1"></span> Not Visited</div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                     <div className="grid grid-cols-4 gap-2">
                        {questions.map((q, i) => (
                            <button 
                                key={q.id} 
                                onClick={() => changeQuestion(i)}
                                className={`
                                    h-8 w-full rounded flex items-center justify-center text-xs font-bold border transition-all
                                    ${getPaletteColor(q.id)}
                                    ${currentQIndex === i ? 'ring-2 ring-black ring-offset-1 z-10' : ''}
                                `}
                            >
                                {q.id}
                            </button>
                        ))}
                     </div>
                </div>

                <div className="p-4 bg-gray-50 border-t">
                    <button 
                        onClick={() => { if(confirm("Are you sure you want to submit?")) submitExam(); }}
                        className="w-full bg-teal-600 text-white py-2 rounded font-bold hover:bg-teal-700"
                    >
                        Submit
                    </button>
                </div>
            </div>
        </div>

        {showCalc && <ScientificCalculator onClose={() => setShowCalc(false)} />}
    </div>
  );

  if (mode === 'result') return (
    <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="bg-white p-8 rounded shadow-lg max-w-lg w-full text-center">
            <h1 className="text-2xl font-bold mb-4">Exam Submitted</h1>
            <p className="text-gray-600 mb-6">
                You have successfully completed the test simulation.
            </p>
            <div className="bg-blue-50 p-4 rounded text-left text-sm text-gray-700 mb-6">
                <strong>Note:</strong> Since this was a PDF-based test, this simulator cannot grade your answers automatically (because it doesn't know the correct answers from the PDF).
                <br/><br/>
                Please use the answer key provided with your PDF to verify your responses manually.
            </div>
            
            <h3 className="font-bold text-left mb-2">Your Responses:</h3>
            <div className="h-64 overflow-y-auto border rounded p-2 text-left mb-6 text-sm">
                {questions.map((q) => {
                    const ans = responses[q.id]?.selectedOption;
                    if (!ans) return null;
                    return (
                        <div key={q.id} className="flex justify-between border-b py-1">
                            <span>Question {q.id}</span>
                            <span className="font-mono font-bold text-blue-600">
                                {Array.isArray(ans) ? ans.join(', ') : ans}
                            </span>
                        </div>
                    );
                })}
                {Object.values(responses).every(r => !r.selectedOption) && <div className="text-gray-400 text-center py-4">No questions attempted.</div>}
            </div>

            <button onClick={() => setMode('home')} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
                Back to Home
            </button>
        </div>
    </div>
  );

  return null;
}