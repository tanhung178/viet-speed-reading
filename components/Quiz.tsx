
import React, { useState } from 'react';
import { QuizQuestion } from '../types';
import { CheckCircle2, XCircle, ChevronRight, Loader2 } from 'lucide-react';

interface QuizProps {
  questions: QuizQuestion[];
  isLoading: boolean;
  onComplete: (score: number) => void;
}

const Quiz: React.FC<QuizProps> = ({ questions, isLoading, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <p className="text-slate-600 font-medium">AI đang tạo câu hỏi kiểm tra cho bạn...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500">
        Không thể tạo câu hỏi cho văn bản này.
        <button onClick={() => onComplete(0)} className="block mx-auto mt-4 text-indigo-600 underline">Quay lại</button>
      </div>
    );
  }

  const handleNext = () => {
    if (selectedAnswer !== null) {
      const newAnswers = [...answers, selectedAnswer];
      setAnswers(newAnswers);
      setSelectedAnswer(null);

      if (currentStep < questions.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        const score = newAnswers.reduce((acc, curr, idx) => {
          return acc + (curr === questions[idx].correctAnswer ? 1 : 0);
        }, 0);
        setIsFinished(true);
        onComplete((score / questions.length) * 100);
      }
    }
  };

  const question = questions[currentStep];

  return (
    <div className="w-full max-w-xl mx-auto bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
      <div className="mb-6 flex justify-between items-center">
        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
          Câu hỏi {currentStep + 1} / {questions.length}
        </span>
        <div className="flex space-x-1">
          {questions.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-1.5 w-8 rounded-full transition-colors ${
                idx <= currentStep ? 'bg-indigo-600' : 'bg-slate-100'
              }`}
            />
          ))}
        </div>
      </div>

      <h3 className="text-xl font-bold text-slate-800 mb-8 leading-relaxed">
        {question.question}
      </h3>

      <div className="space-y-3">
        {question.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedAnswer(idx)}
            className={`w-full p-4 text-left rounded-2xl border-2 transition-all duration-200 flex items-center group ${
              selectedAnswer === idx 
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200' 
                : 'border-slate-100 hover:border-indigo-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className={`w-8 h-8 rounded-full border flex items-center justify-center mr-4 text-sm font-bold transition-colors ${
              selectedAnswer === idx ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 text-slate-400 group-hover:border-indigo-300 group-hover:text-indigo-600'
            }`}>
              {String.fromCharCode(65 + idx)}
            </div>
            {option}
          </button>
        ))}
      </div>

      <button
        onClick={handleNext}
        disabled={selectedAnswer === null}
        className={`mt-8 w-full py-4 rounded-2xl font-bold flex items-center justify-center transition-all ${
          selectedAnswer !== null 
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98]' 
            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
        }`}
      >
        {currentStep === questions.length - 1 ? 'Hoàn thành' : 'Tiếp theo'}
        <ChevronRight size={20} className="ml-2" />
      </button>
    </div>
  );
};

export default Quiz;
