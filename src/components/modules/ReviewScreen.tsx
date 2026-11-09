import React, { useState } from 'react';
import { Flashcard, QuizQuestion, FillBlank } from '../../lib/engine/types';
import { db } from '../../lib/db';
import {
  Sliders,
  Layers,
  HelpCircle,
  Edit3,
  Trash2,
  Check,
  Plus,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Save,
  CheckCircle2
} from 'lucide-react';

interface ReviewScreenProps {
  materialId: string;
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
  fillBlanks: FillBlank[];
  onRefreshAll: () => void;
  onGoToStudy: () => void;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  materialId,
  flashcards,
  quizQuestions,
  fillBlanks,
  onRefreshAll,
  onGoToStudy
}) => {
  const [activeTab, setActiveTab] = useState<'cards' | 'quiz' | 'fill'>('cards');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');

  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editOptions, setEditOptions] = useState<string[]>([]);
  const [editCorrectIdx, setEditCorrectIdx] = useState(0);

  // Quality Dot Helper
  const renderQualityBadge = (quality: number) => {
    if (quality >= 0.85) {
      return (
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>მაღალი ({Math.round(quality * 100)}%)</span>
        </span>
      );
    } else if (quality >= 0.65) {
      return (
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>საშუალო ({Math.round(quality * 100)}%)</span>
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-red-500">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span>დაბალი ({Math.round(quality * 100)}%)</span>
        </span>
      );
    }
  };

  // Delete single flashcard
  const handleDeleteCard = async (id: string) => {
    await db.flashcards.delete(id);
    onRefreshAll();
  };

  // Delete single quiz question
  const handleDeleteQuiz = async (id: string) => {
    await db.quizQuestions.delete(id);
    onRefreshAll();
  };

  // Delete single fill blank
  const handleDeleteFill = async (id: string) => {
    await db.fillBlanks.delete(id);
    onRefreshAll();
  };

  // Delete all low quality (red) items across the active tab
  const handleDeleteAllRed = async () => {
    if (window.confirm('დარწმუნებული ხართ, რომ გსურთ ყველა დაბალი ხარისხის ელემენტის წაშლა?')) {
      if (activeTab === 'cards') {
        const redCards = flashcards.filter(c => c.quality < 0.65);
        for (const c of redCards) await db.flashcards.delete(c.id);
      } else if (activeTab === 'quiz') {
        const redQuiz = quizQuestions.filter(q => q.quality < 0.65);
        for (const q of redQuiz) await db.quizQuestions.delete(q.id);
      } else {
        const redFill = fillBlanks.filter(f => f.quality < 0.65);
        for (const f of redFill) await db.fillBlanks.delete(f.id);
      }
      onRefreshAll();
    }
  };

  // Save Card Edit
  const handleSaveCardEdit = async (card: Flashcard) => {
    await db.flashcards.update(card.id, {
      front: editFront.trim() || card.front,
      back: editBack.trim() || card.back,
      origin: 'edited'
    });
    setEditingCardId(null);
    onRefreshAll();
  };

  // Save Quiz Edit
  const handleSaveQuizEdit = async (q: QuizQuestion) => {
    await db.quizQuestions.update(q.id, {
      question: editQuestion.trim() || q.question,
      options: editOptions,
      correctIndex: editCorrectIdx,
      origin: 'edited'
    });
    setEditingQuizId(null);
    onRefreshAll();
  };

  // Convert Flashcard to Quiz question
  const handleConvertCardToQuiz = async (card: Flashcard) => {
    const newQuiz: QuizQuestion = {
      id: 'quiz-conv-' + Date.now(),
      materialId,
      question: card.front,
      options: [card.back, 'ვარიანტი 2', 'ვარიანტი 3', 'ვარიანტი 4'],
      correctIndex: 0,
      explanation: card.back,
      sourceSentence: card.back,
      sourceRef: card.sourceRef || { sectionTitle: 'ბარათიდან გადაკეთებული' },
      quality: 1.0,
      origin: 'manual'
    };
    await db.quizQuestions.add(newQuiz);
    alert('ბარათი წარმატებით გადაკეთდა ქვიზის კითხვად!');
    onRefreshAll();
  };

  return (
    <div className="max-w-4xl mx-auto my-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
            <Sliders className="w-4 h-4" />
            <span>ხარისხის კონტროლი</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-slate-900 dark:text-white">
            გენერირებული ელემენტების გადახედვა
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            შეამოწმეთ, შეასწორეთ ან წაშალეთ ელემენტები სწავლის დაწყებამდე.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDeleteAllRed}
            className="px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900/60 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            დაბალი ხარისხის წაშლა
          </button>
          <button
            onClick={onGoToStudy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition-colors"
          >
            <span>სწავლაზე დაბრუნება</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Module Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-medium">
        <button
          onClick={() => setActiveTab('cards')}
          className={`flex items-center gap-2 py-2 px-4 rounded-lg transition-colors ${
            activeTab === 'cards'
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>ბარათები ({flashcards.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('quiz')}
          className={`flex items-center gap-2 py-2 px-4 rounded-lg transition-colors ${
            activeTab === 'quiz'
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>ქვიზის კითხვები ({quizQuestions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('fill')}
          className={`flex items-center gap-2 py-2 px-4 rounded-lg transition-colors ${
            activeTab === 'fill'
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>წერითი ტესტი ({fillBlanks.length})</span>
        </button>
      </div>

      {/* ITEMS LIST */}
      <div className="space-y-4">
        {/* 1. Flashcards Review List */}
        {activeTab === 'cards' &&
          [...flashcards]
            .sort((a, b) => a.quality - b.quality)
            .map((card) => {
              const isEditing = editingCardId === card.id;

              return (
                <div
                  key={card.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      {renderQualityBadge(card.quality)}
                      {card.origin !== 'auto' && (
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {card.origin === 'manual' ? 'ხელით' : 'შესწორებული'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!isEditing ? (
                        <>
                          <button
                            onClick={() => {
                              setEditingCardId(card.id);
                              setEditFront(card.front);
                              setEditBack(card.back);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            title="რედაქტირება"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleConvertCardToQuiz(card)}
                            className="text-[11px] text-indigo-600 hover:underline px-1.5"
                          >
                            → ქვიზად გადაკეთება
                          </button>
                          <button
                            onClick={() => handleDeleteCard(card.id)}
                            className="p-1 rounded text-slate-400 hover:text-red-600"
                            title="წაშლა"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleSaveCardEdit(card)}
                          className="flex items-center gap-1 text-xs text-emerald-600 font-semibold"
                        >
                          <Save className="w-4 h-4" />
                          <span>შენახვა</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {!isEditing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-slate-400 font-semibold block mb-1">კითხვა:</span>
                        <p className="font-serif font-bold text-slate-900 dark:text-white">
                          {card.front}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-slate-400 font-semibold block mb-1">პასუხი:</span>
                        <p className="text-slate-700 dark:text-slate-300">{card.back}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block text-slate-500 mb-1">კითხვა:</label>
                        <input
                          type="text"
                          value={editFront}
                          onChange={(e) => setEditFront(e.target.value)}
                          className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 mb-1">პასუხი:</label>
                        <textarea
                          rows={2}
                          value={editBack}
                          onChange={(e) => setEditBack(e.target.value)}
                          className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

        {/* 2. Quiz Review List */}
        {activeTab === 'quiz' &&
          [...quizQuestions]
            .sort((a, b) => a.quality - b.quality)
            .map((q) => {
              return (
                <div
                  key={q.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      {renderQualityBadge(q.quality)}
                      {q.origin !== 'auto' && (
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {q.origin === 'manual' ? 'ხელით' : 'შესწორებული'}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteQuiz(q.id)}
                      className="p-1 rounded text-slate-400 hover:text-red-600"
                      title="წაშლა"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <p className="font-serif font-bold text-slate-900 dark:text-white text-sm">
                      {q.question}
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`p-2 rounded-lg text-xs ${
                            oIdx === q.correctIndex
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold border border-emerald-300 dark:border-emerald-800'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <span className="font-mono mr-1.5">{oIdx + 1}.</span>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400 italic pt-1">
                      წყარო: „{q.sourceSentence}“
                    </p>
                  </div>
                </div>
              );
            })}

        {/* 3. Fill in Blank Review List */}
        {activeTab === 'fill' &&
          [...fillBlanks]
            .sort((a, b) => a.quality - b.quality)
            .map((f) => (
              <div
                key={f.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                  {renderQualityBadge(f.quality)}
                  <button
                    onClick={() => handleDeleteFill(f.id)}
                    className="p-1 rounded text-slate-400 hover:text-red-600"
                    title="წაშლა"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs space-y-2">
                  <p className="font-serif text-slate-900 dark:text-white text-sm leading-relaxed">
                    {f.before} <span className="font-bold underline text-emerald-600 px-1">{f.answer}</span> {f.after}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    მინიშნება: {f.hint || '—'}
                  </p>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
};
