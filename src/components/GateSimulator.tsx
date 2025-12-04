import React, { useState, useEffect } from 'react';
import {
  Calculator,
  ChevronRight,
  Clock,
  FileJson,
  Play,
  Plus,
  Trash2,
  Menu,
  X
} from 'lucide-react';

/* Simplified but fully working GateSimulator based on your code */

type QuestionType = 'MCQ' | 'MSQ' | 'NAT';
interface Question { id:string; text:string; type:QuestionType; options?:string[]; correctAnswer:string | string[]; marks:number; negativeMarks:number; }
interface QuestionStatus { visited:boolean; answered:boolean; markedForReview:boolean; selectedOption:string | string[] | null; }
interface TestData { title:string; durationMinutes:number; questions:Question[]; }

const SAMPLE_TEST: TestData = {
  title: "GATE CS Mock Test - Sample",
  durationMinutes: 180,
  questions: [
    { id: "q1", text: "Which of the following is TRUE for a standard TCP connection?", type: "MCQ", options: ["Sequence numbers are synonymous with packet numbers.","It provides full-duplex service.","The window size is always fixed.","It does not support flow control."], correctAnswer: "It provides full-duplex service.", marks:1, negativeMarks:0.33 },
    { id: "q2", text: "Consider the matrix A with Eigenvalues 2, 4, and 6. What is the determinant of A?", type: "NAT", correctAnswer: "48", marks:2, negativeMarks:0 },
    { id: "q3", text: "Which of the following are valid sorting algorithms with O(n log n) worst-case time complexity? (Select all that apply)", type: "MSQ", options:["Merge Sort","Quick Sort","Heap Sort","Bubble Sort"], correctAnswer:["Merge Sort","Heap Sort"], marks:2, negativeMarks:0 }
  ]
};

const ScientificCalculator = ({ onClose }: { onClose: ()=>void }) => {
  const [display,setDisplay]=useState("0");
  const handleBtn=(v:string)=>{ if(v==='C') setDisplay("0"); else if(v==='='){ try{ // eslint-disable-next-line no-new-func
    const r = new Function('return '+display)(); setDisplay(String(r)); }catch{ setDisplay("Error"); } } else setDisplay(display==="0"?v:display+v); };
  return (
    <div className="fixed top-20 left-10 bg-gray-200 border p-2 w-64 z-50">
      <div className="bg-blue-800 text-white p-1 flex justify-between items-center">
        <span className="text-xs font-bold">Scientific Calculator</span>
        <button onClick={onClose}><X size={14} /></button>
      </div>
      <input className="w-full p-2 my-2 text-right border" value={display} readOnly />
      <div className="grid grid-cols-4 gap-1">
        {['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+'].map(b=>(
          <button key={b} onClick={()=>handleBtn(b)} className="p-2 border bg-gray-100">{b}</button>
        ))}
        <button onClick={()=>handleBtn('C')} className="col-span-4 p-1 border bg-red-100">Clear</button>
      </div>
    </div>
  );
};

export default function GateSimulator(){
  const [mode,setMode]=useState<'home'|'creator'|'exam'|'result'>('home');
  const [testData,setTestData]=useState<TestData>(SAMPLE_TEST);
  const [currentQIndex,setCurrentQIndex]=useState(0);
  const [responses,setResponses]=useState<Record<string,QuestionStatus>>({});
  const [timeLeft,setTimeLeft]=useState(0);
  const [showCalc,setShowCalc]=useState(false);
  const [isSidebarOpen,setSidebarOpen]=useState(false);

  useEffect(()=>{ let t:number; if(mode==='exam' && timeLeft>0){ t=window.setInterval(()=>setTimeLeft(p=>p<=1?(setMode('result'),0):p-1),1000);} return ()=>clearInterval(t); },[mode,timeLeft]);

  const startExam=()=>{ setTimeLeft(testData.durationMinutes*60); const ir:Record<string,QuestionStatus>={}; testData.questions.forEach(q=>ir[q.id]={visited:false,answered:false,markedForReview:false,selectedOption:null}); if(testData.questions.length>0) ir[testData.questions[0].id].visited=true; setResponses(ir); setCurrentQIndex(0); setMode('exam'); setSidebarOpen(false); }

  // helper
  const formatTime = (seconds:number)=>{ const h=Math.floor(seconds/3600); const m=Math.floor((seconds%3600)/60); const s=seconds%60; return `${h}:${m<10?'0':''}${m}:${s<10?'0':''}${s}`; }

  // simplified exam handlers
  const currentQ = testData.questions[currentQIndex];
  const currentStatus = responses[currentQ?.id] || {visited:false,answered:false,markedForReview:false,selectedOption:null};

  const updateStatus = (updates:Partial<QuestionStatus>)=> setResponses(prev=>({ ...prev, [currentQ.id]: {...prev[currentQ.id], ...updates}}));

  const handleOptionSelect=(val:string)=>{ if(currentQ.type==='MCQ') updateStatus({selectedOption:val}); else if(currentQ.type==='MSQ'){ const cur=(currentStatus.selectedOption as string[])||[]; if(cur.includes(val)) updateStatus({selectedOption:cur.filter(x=>x!==val)}); else updateStatus({selectedOption:[...cur,val]}); } }

  const handleSaveNext=()=>{ updateStatus({ answered: currentStatus.selectedOption!==null && currentStatus.selectedOption!=='' && (!(Array.isArray(currentStatus.selectedOption)) || (currentStatus.selectedOption as string[]).length>0), visited:true }); if(currentQIndex<testData.questions.length-1) changeQuestion(currentQIndex+1); }

  const handleMarkReview=()=>{ updateStatus({ markedForReview:true, answered: currentStatus.selectedOption!==null && currentStatus.selectedOption!=='' && (!(Array.isArray(currentStatus.selectedOption)) || (currentStatus.selectedOption as string[]).length>0), visited:true }); if(currentQIndex<testData.questions.length-1) changeQuestion(currentQIndex+1); }

  const handleClearResponse=()=> updateStatus({ selectedOption:null, answered:false });

  const changeQuestion=(index:number)=>{ setResponses(prev=>{ const nextQId=testData.questions[index].id; return {...prev, [nextQId]:{ ...prev[nextQId], visited:true }} }); setCurrentQIndex(index); }

  const getPaletteColor=(qId:string)=>{ const s=responses[qId]; if(!s) return 'bg-gray-200 text-black'; if(s.markedForReview && s.answered) return 'bg-purple-600 text-white'; if(s.markedForReview) return 'bg-purple-600 text-white'; if(s.answered) return 'bg-green-500 text-white'; if(!s.answered && s.visited) return 'bg-red-500 text-white'; return 'bg-gray-200 text-black'; }

  // result calculation
  const computeResult = ()=> {
    let score=0,attempted=0,correct=0,wrong=0;
    const report = testData.questions.map(q=>{
      const resp = responses[q.id];
      const isAttempted = resp?.answered || (resp?.selectedOption != null && resp?.selectedOption !== '');
      let isCorrect=false; let marksEarned=0;
      if(isAttempted){
        attempted++;
        if(q.type==='NAT'){
          if(String(resp.selectedOption).trim()===String(q.correctAnswer).trim()){ isCorrect=true; marksEarned=q.marks; }
        } else if(q.type==='MCQ'){
          if(resp.selectedOption===q.correctAnswer){ isCorrect=true; marksEarned=q.marks; } else { marksEarned = -q.negativeMarks; wrong++; }
        } else if(q.type==='MSQ'){
          const userArr = (resp.selectedOption as string[])?.sort().join(',') || '';
          const correctArr = (q.correctAnswer as string[])?.sort().join(',') || '';
          if(userArr===correctArr){ isCorrect=true; marksEarned=q.marks; }
        }
        if(isCorrect) correct++;
      }
      score += marksEarned;
      return {...q, userAnswer: resp?.selectedOption, isCorrect, marksEarned};
    });
    return {score,attempted,correct,wrong,report};
  };

  if(mode==='home') return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded shadow max-w-2xl w-full">
        <h1 className="text-2xl font-bold text-blue-800 mb-4">GATE Exam Simulator</h1>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="p-4 border rounded cursor-pointer" onClick={()=>setMode('creator')}>
            <div className="flex items-center mb-2"><Plus size={20} className="mr-2" />Create Test</div>
            <div className="text-sm text-gray-600">Add questions manually and save JSON.</div>
          </div>
          <div className="p-4 border rounded cursor-pointer" onClick={()=>document.getElementById('file-upload')?.click()}>
            <div className="flex items-center mb-2"><FileJson size={20} className="mr-2" />Load Test</div>
            <div className="text-sm text-gray-600">Import JSON test file.</div>
            <input id="file-upload" type="file" accept=".json" className="hidden" onChange={(e:any)=>{ const file=e.target.files?.[0]; if(file){ const reader=new FileReader(); reader.onload=(ev:any)=>{ try{ setTestData(JSON.parse(ev.target.result)); alert('Loaded'); }catch{ alert('Invalid JSON'); } }; reader.readAsText(file); }}}/>
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-2">Current Test: <strong>{testData.title}</strong></div>
          <div className="mb-4 text-sm text-gray-600">{testData.questions.length} Questions • {testData.durationMinutes} Minutes</div>
          <button className="w-full bg-blue-600 text-white p-3 rounded" onClick={()=>{
            // initialize responses
            const initial:Record<string,QuestionStatus>={};
            testData.questions.forEach(q=> initial[q.id]={visited:false,answered:false,markedForReview:false,selectedOption:null});
            if(testData.questions.length>0) initial[testData.questions[0].id].visited=true;
            setResponses(initial); setTimeLeft(testData.durationMinutes*60); setMode('exam');
          }}><Play size={18} className="inline mr-2"/>Start Exam</button>
        </div>
      </div>
    </div>
  );

  if(mode==='creator') return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Test Creator</h2>
          <div>
            <button className="bg-green-600 text-white px-3 py-1 rounded mr-2" onClick={()=>{
              const dataStr = "data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(testData,null,2));
              const a=document.createElement('a'); a.href=dataStr; a.download='gate_mock_test.json'; document.body.appendChild(a); a.click(); a.remove();
            }}>Save JSON</button>
            <button className="bg-gray-600 text-white px-3 py-1 rounded" onClick={()=>setMode('home')}>Exit</button>
          </div>
        </div>
        <div className="border p-4 rounded bg-gray-50 mb-4">
          <h3 className="font-bold mb-2">Add New Question</h3>
          <p className="text-sm text-gray-600">Use the creator to add questions in-app (demo simplified).</p>
          <div className="mt-3">
            <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={()=>{
              const q:Question={ id:'q'+Date.now(), text:'New sample question', type:'MCQ', options:['A','B','C','D'], correctAnswer:'A', marks:1, negativeMarks:0.33};
              setTestData(prev=>({...prev, questions:[...prev.questions,q]}));
            }}>Add Sample Question</button>
          </div>
        </div>
        <div>
          <h3 className="font-bold mb-2">Questions ({testData.questions.length})</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {testData.questions.map((q,i)=>(
              <div key={q.id} className="p-3 border rounded bg-white flex justify-between items-center">
                <div className="truncate w-3/4"><strong>Q{i+1}.</strong> {q.text}</div>
                <button className="text-red-500" onClick={()=>setTestData(prev=>({...prev, questions: prev.questions.filter(x=>x.id!==q.id)}))}><Trash2/></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if(mode==='exam') return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-white p-3 flex justify-between items-center border-b">
        <div className="font-bold">GATE Exam Simulator</div>
        <div className="flex items-center space-x-3">
          <div className="bg-gray-800 text-white px-3 py-1 rounded"><Clock size={16} className="inline mr-1"/><span className="font-mono">{formatTime(timeLeft)}</span></div>
          <button className="md:hidden p-2" onClick={()=>setSidebarOpen(s=>!s)}><Menu/></button>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 flex flex-col">
          <div className="bg-blue-600 text-white p-2 flex justify-between items-center">
            <div>Question {currentQIndex+1}</div>
            <div className="flex items-center space-x-2">
              <button className="bg-white text-blue-800 px-2 py-1 rounded" onClick={()=>setShowCalc(s=>!s)}><Calculator size={14}/> Calculator</button>
              <div className="text-xs bg-white/20 px-2 py-1 rounded">Marks: {currentQ.marks} | Neg: -{currentQ.negativeMarks}</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            <div className="max-w-4xl mx-auto">
              <div className="text-lg mb-6 border-b pb-4">{currentQ.text}</div>
              <div className="space-y-3">
                {currentQ.type==='NAT' ? (
                  <div>
                    <label className="font-semibold block mb-2">Your Answer:</label>
                    <input type="text" className="border p-2 rounded w-48 font-mono text-lg" value={(currentStatus.selectedOption as string) || ''} onChange={(e)=>updateStatus({selectedOption:e.target.value})}/>
                  </div>
                ) : (
                  currentQ.options?.map((opt,idx)=>(
                    <div key={idx} onClick={()=>handleOptionSelect(opt)} className={`flex items-start p-3 border rounded cursor-pointer ${ (currentQ.type==='MCQ' ? currentStatus.selectedOption===opt : (currentStatus.selectedOption as string[])?.includes(opt)) ? 'border-blue-500 bg-blue-50':'border-gray-200' }`}>
                      <div className={`w-5 h-5 mr-3 mt-1 border-2 ${currentQ.type==='MCQ' ? 'rounded-full':'rounded-sm'} ${(currentQ.type==='MCQ' ? currentStatus.selectedOption===opt : (currentStatus.selectedOption as string[])?.includes(opt)) ? 'border-blue-600 bg-blue-600':'border-gray-400'}`}></div>
                      <span>{opt}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <div className="bg-gray-100 p-2 flex justify-between items-center">
            <div className="flex space-x-2">
              <button className="px-4 py-2 bg-purple-600 text-white rounded" onClick={handleMarkReview}>Mark for Review & Next</button>
              <button className="px-4 py-2 bg-white border rounded" onClick={handleClearResponse}>Clear Response</button>
            </div>
            <button className="px-6 py-2 bg-green-600 text-white rounded flex items-center" onClick={handleSaveNext}>Save & Next <ChevronRight size={16} className="ml-1"/></button>
          </div>
        </main>
        <aside className={`absolute md:relative right-0 top-0 h-full w-80 bg-blue-50 border-l transform ${isSidebarOpen ? 'translate-x-0':'translate-x-full md:translate-x-0'}`}>
          <div className="p-4 bg-white border-b">
            <div className="flex items-center mb-4"><div className="w-10 h-10 bg-gray-300 rounded-full mr-3"></div><div><div className="font-bold">John Doe</div><div className="text-xs text-gray-500">Candidate</div></div></div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center"><div className="w-4 h-4 bg-green-500 mr-1"></div> Answered</div>
              <div className="flex items-center"><div className="w-4 h-4 bg-red-500 mr-1"></div> Not Answered</div>
              <div className="flex items-center"><div className="w-4 h-4 bg-gray-200 mr-1 border"></div> Not Visited</div>
              <div className="flex items-center"><div className="w-4 h-4 bg-purple-600 mr-1"></div> Mark for Review</div>
            </div>
          </div>
          <div className="p-4 overflow-y-auto h-[calc(100%-180px)]">
            <h3 className="font-bold mb-2">Question Palette</h3>
            <div className="grid grid-cols-4 gap-2">
              {testData.questions.map((q,idx)=>(
                <button key={q.id} onClick={()=>changeQuestion(idx)} className={`h-9 w-full rounded border ${getPaletteColor(q.id)} ${currentQIndex===idx ? 'ring-2 ring-blue-500':''}`}>{idx+1}</button>
              ))}
            </div>
          </div>
          <div className="absolute bottom-0 w-full p-4 bg-white border-t">
            <button className="w-full bg-blue-100 text-blue-800 py-2 rounded" onClick={()=>{ if(window.confirm('Submit exam?')) setMode('result'); }}>Submit Exam</button>
          </div>
        </aside>
      </div>
      {showCalc && <ScientificCalculator onClose={()=>setShowCalc(false)} />}
    </div>
  );

  // result view
  if(mode==='result'){
    const {score,attempted,correct,wrong,report} = computeResult();
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded shadow overflow-hidden">
          <div className="bg-blue-800 text-white p-6">
            <h1 className="text-2xl font-bold">Exam Result</h1>
            <div className="text-blue-200">{testData.title}</div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-50 p-4 rounded text-center"><div className="text-3xl font-bold text-blue-700">{score.toFixed(2)}</div><div className="text-xs text-gray-500">Total Score</div></div>
              <div className="bg-gray-50 p-4 rounded text-center"><div className="text-3xl font-bold">{testData.questions.length}</div><div className="text-xs text-gray-500">Total Questions</div></div>
              <div className="bg-green-50 p-4 rounded text-center"><div className="text-3xl font-bold text-green-700">{correct}</div><div className="text-xs text-gray-500">Correct</div></div>
              <div className="bg-red-50 p-4 rounded text-center"><div className="text-3xl font-bold text-red-700">{wrong}</div><div className="text-xs text-gray-500">Wrong (MCQ)</div></div>
            </div>
            <h2 className="text-xl font-bold mb-4">Question Analysis</h2>
            <div className="space-y-4">
              {report.map((item,idx)=>(
                <div key={item.id} className={`border rounded p-4 ${item.isCorrect ? 'border-green-200 bg-green-50/30':'border-red-200 bg-red-50/30'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold">Q{idx+1}. {item.type}</span>
                    <span className={`font-bold ${item.marksEarned>=0 ? 'text-green-600':'text-red-600'}`}>{item.marksEarned>0?'+':''}{item.marksEarned.toFixed(2)}</span>
                  </div>
                  <p className="mb-3">{item.text}</p>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div><span className="font-semibold block text-gray-600">Your Answer:</span><div className="p-2 bg-white border rounded mt-1">{item.userAnswer? (Array.isArray(item.userAnswer)? item.userAnswer.join(', '): item.userAnswer) : <span className="text-gray-400 italic">Not Attempted</span>}</div></div>
                    <div><span className="font-semibold block text-gray-600">Correct Answer:</span><div className="p-2 bg-white border rounded mt-1 text-green-700 font-medium">{Array.isArray(item.correctAnswer)? item.correctAnswer.join(', '): item.correctAnswer}</div></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex justify-end"><button className="px-6 py-2 bg-blue-600 text-white rounded" onClick={()=>setMode('home')}>Back to Home</button></div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
