import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Plus, Check, X as XIcon, Loader2, MapPin, Globe, Calendar, Sparkles, PenLine, Rocket, CalendarPlus, Edit3, HelpCircle } from 'lucide-react';
import { ChatMessage, PendingAction, GroundingChunk } from '@/types';
import { ChatMode } from '@/hooks/useChat';

interface ChatAssistantProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onConfirmAction: (messageId: string, action: PendingAction, selectedOption?: string) => void;
  onCancelAction: (messageId: string) => void;
  isLoading: boolean;
  hasActiveTrip: boolean;
  activeTripTitle?: string;
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  onClose?: () => void;
  isVisible?: boolean;
}

const SourceLink: React.FC<{ chunk: GroundingChunk }> = ({ chunk }) => {
  if (chunk.maps?.uri) {
    return (
      <a 
        href={chunk.maps.uri} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition-colors border-2 border-blue-100"
      >
        <MapPin className="w-3 h-3 flex-shrink-0" />
        <span className="truncate max-w-[150px]">{chunk.maps.title || "Maps"}</span>
      </a>
    );
  }
  if (chunk.web?.uri) {
    return (
      <a 
        href={chunk.web.uri} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors border-2 border-slate-200"
      >
        <Globe className="w-3 h-3 flex-shrink-0" />
        <span className="truncate max-w-[150px]">{chunk.web.title || "Web"}</span>
      </a>
    );
  }
  return null;
};

const ChatAssistant: React.FC<ChatAssistantProps> = ({
  messages,
  onSendMessage,
  onConfirmAction,
  onCancelAction,
  isLoading,
  hasActiveTrip,
  activeTripTitle,
  mode,
  onModeChange,
  onClose,
  isVisible = true
}) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div
      className={`fixed bottom-6 right-6 w-[400px] h-[600px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border-2 border-slate-200 z-50 font-sans transition-all duration-300 ${
        isVisible
          ? 'opacity-100 scale-100 pointer-events-auto'
          : 'opacity-0 scale-95 pointer-events-none'
      }`}
      style={{ visibility: isVisible ? 'visible' : 'hidden' }}
    >
      {/* Header */}
      <div className="p-4 bg-white border-b-2 border-slate-100">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`w-3 h-3 absolute -right-0.5 -bottom-0.5 rounded-full border-2 border-white ${isLoading ? 'bg-amber-400' : 'bg-green-500'}`}></div>
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                 <Sparkles size={20} />
              </div>
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg leading-tight">TripPilot</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                {isLoading ? 'Thinking...' : 'Online'}
              </p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <X className="w-6 h-6" strokeWidth={3} />
            </button>
          )}
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => onModeChange('create')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
              mode === 'create'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Rocket className="w-3.5 h-3.5" />
            New Trip
          </button>
          <button
            onClick={() => hasActiveTrip && onModeChange('edit')}
            disabled={!hasActiveTrip}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
              mode === 'edit'
                ? 'bg-white text-amber-600 shadow-sm'
                : hasActiveTrip
                  ? 'text-slate-500 hover:text-slate-700'
                  : 'text-slate-300 cursor-not-allowed'
            }`}
          >
            <PenLine className="w-3.5 h-3.5" />
            Edit Trip
          </button>
        </div>

        {/* Mode Context */}
        {mode === 'edit' && activeTripTitle && (
          <div className="mt-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-xs font-bold text-amber-700 truncate">
              Editing: {activeTripTitle}
            </p>
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div 
              className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-500 text-white rounded-br-none border-b-4 border-blue-700' 
                  : 'bg-white text-slate-600 border-2 border-slate-200 rounded-bl-none'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Grounding Sources */}
              {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                <div className="mt-4 pt-3 border-t-2 border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Sources</p>
                  <div className="flex flex-wrap gap-2">
                    {msg.groundingChunks.map((chunk, idx) => (
                      <SourceLink key={idx} chunk={chunk} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Pending Action Card */}
            {msg.pendingAction && msg.pendingAction.status === 'pending' && (
              <div className="mt-3 max-w-[90%] w-full bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                {/* Clarification Card - Special Layout */}
                {msg.pendingAction.type === 'ask_clarification' ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <HelpCircle className="w-5 h-5 text-slate-500" />
                      <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Choose an option</p>
                    </div>
                    <div className="space-y-2">
                      {msg.pendingAction.data.options?.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => onConfirmAction(msg.id, msg.pendingAction!, option)}
                          className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-blue-50 border-2 border-slate-200 hover:border-blue-300 rounded-xl text-sm font-bold text-slate-700 hover:text-blue-700 transition-all"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => onCancelAction(msg.id)}
                      className="mt-3 w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl border-b-4 flex-shrink-0 ${
                      msg.pendingAction.type === 'create_trip_with_itinerary'
                        ? 'bg-purple-100 border-purple-300 text-purple-600'
                        : msg.pendingAction.type === 'replace_itinerary'
                          ? 'bg-amber-100 border-amber-300 text-amber-600'
                          : msg.pendingAction.type === 'add_day'
                            ? 'bg-blue-100 border-blue-300 text-blue-600'
                            : msg.pendingAction.type === 'modify_day'
                              ? 'bg-orange-100 border-orange-300 text-orange-600'
                              : 'bg-green-100 border-green-300 text-green-600'
                    }`}>
                      {msg.pendingAction.type === 'create_trip_with_itinerary' ? (
                        <Sparkles className="w-6 h-6" />
                      ) : msg.pendingAction.type === 'replace_itinerary' ? (
                        <Sparkles className="w-6 h-6" />
                      ) : msg.pendingAction.type === 'add_day' ? (
                        <CalendarPlus className="w-6 h-6" />
                      ) : msg.pendingAction.type === 'modify_day' ? (
                        <Edit3 className="w-6 h-6" />
                      ) : (
                        <Plus className="w-6 h-6" strokeWidth={3} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">
                        {msg.pendingAction.type === 'create_trip_with_itinerary'
                          ? 'New Trip Proposal'
                          : msg.pendingAction.type === 'replace_itinerary'
                            ? 'Replace Itinerary'
                            : msg.pendingAction.type === 'add_day'
                              ? 'Add Days'
                              : msg.pendingAction.type === 'modify_day'
                                ? 'Modify Day'
                                : 'Add Activity'}
                      </p>

                      {msg.pendingAction.type === 'create_trip_with_itinerary' ? (
                        <div className="mb-4">
                          <p className="text-xl font-black text-slate-800 leading-tight mb-2">
                            {msg.pendingAction.data.tripInput?.title}
                          </p>
                          <div className="flex flex-col gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 w-fit">
                              <MapPin className="w-3.5 h-3.5" />
                              {msg.pendingAction.data.tripInput?.destination}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">
                                <Calendar className="w-3.5 h-3.5" />
                                {msg.pendingAction.data.itinerary?.days.length} Days
                              </span>
                              <span className="text-xs font-bold text-slate-400">
                                {msg.pendingAction.data.tripInput?.startDate} → {msg.pendingAction.data.tripInput?.endDate}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : msg.pendingAction.type === 'replace_itinerary' ? (
                        <div className="mb-4">
                          <p className="text-xl font-black text-slate-800 leading-tight mb-2">
                            {msg.pendingAction.data.itinerary?.title}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">
                              <Calendar className="w-3.5 h-3.5" />
                              {msg.pendingAction.data.itinerary?.days.length} Days
                            </span>
                          </div>
                        </div>
                      ) : msg.pendingAction.type === 'add_day' ? (
                        <div className="mb-4">
                          <p className="text-lg font-black text-slate-800 leading-tight mb-2">
                            Add {msg.pendingAction.data.days?.length} Day{(msg.pendingAction.data.days?.length || 0) > 1 ? 's' : ''}
                          </p>
                          <div className="space-y-1.5">
                            {msg.pendingAction.data.days?.slice(0, 3).map((day, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                                <span className="font-bold text-blue-600">Day {day.dayNumber}:</span>
                                <span>{day.activities?.[0]?.location?.name || 'Activities planned'}</span>
                              </div>
                            ))}
                            {(msg.pendingAction.data.days?.length || 0) > 3 && (
                              <p className="text-xs text-slate-400 font-bold">+{(msg.pendingAction.data.days?.length || 0) - 3} more days</p>
                            )}
                          </div>
                        </div>
                      ) : msg.pendingAction.type === 'modify_day' ? (
                        <div className="mb-3">
                          <p className="text-lg font-black text-slate-800 leading-tight mb-2">
                            Update Day {msg.pendingAction.data.dayNumber}
                          </p>
                          <p className="text-xs text-slate-500 font-bold">
                            {msg.pendingAction.data.modifyAction === 'add_activities'
                              ? `Add ${msg.pendingAction.data.activities?.length || 0} activities`
                              : msg.pendingAction.data.modifyAction === 'remove_activities'
                                ? 'Remove activities'
                                : 'Replace activities'}
                          </p>
                        </div>
                      ) : (
                        <div className="mb-3">
                          <p className="text-base font-bold text-slate-800 leading-snug">
                            {msg.pendingAction.data.activity?.description}
                          </p>
                          <p className="text-xs font-bold text-slate-400 mt-1 uppercase">{msg.pendingAction.data.activity?.location?.name}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => onConfirmAction(msg.id, msg.pendingAction!)}
                          className="btn-press flex items-center justify-center gap-2 py-2.5 bg-blue-500 hover:bg-blue-400 border-b-4 border-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                        >
                          <Check className="w-4 h-4" strokeWidth={3} />
                          {msg.pendingAction.type === 'create_trip_with_itinerary' ? 'Create'
                            : msg.pendingAction.type === 'replace_itinerary' ? 'Replace'
                            : msg.pendingAction.type === 'add_day' ? 'Add Days'
                            : msg.pendingAction.type === 'modify_day' ? 'Update'
                            : 'Add'}
                        </button>
                        <button
                          onClick={() => onCancelAction(msg.id)}
                          className="btn-press flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 border-b-4 border-slate-300 text-slate-500 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                        >
                          <XIcon className="w-4 h-4" strokeWidth={3} />
                          Skip
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Status Messages */}
            {msg.pendingAction?.status === 'confirmed' && (
               <div className="mt-2 text-xs font-bold text-green-500 flex items-center gap-1.5 ml-2 bg-green-50 px-3 py-1 rounded-full border border-green-100 w-fit">
                 <Check className="w-3.5 h-3.5" strokeWidth={3} />
                 {msg.pendingAction.type === 'create_trip_with_itinerary'
                   ? 'Trip Created!'
                   : msg.pendingAction.type === 'replace_itinerary'
                     ? 'Itinerary Updated!'
                     : msg.pendingAction.type === 'add_day'
                       ? 'Days Added!'
                       : msg.pendingAction.type === 'modify_day'
                         ? 'Day Updated!'
                         : msg.pendingAction.type === 'ask_clarification'
                           ? `Selected: ${msg.pendingAction.data.selectedOption}`
                           : 'Added!'}
               </div>
            )}
             {msg.pendingAction?.status === 'cancelled' && (
               <div className="mt-2 text-xs font-bold text-slate-400 flex items-center gap-1.5 ml-2 bg-slate-100 px-3 py-1 rounded-full w-fit">
                 <XIcon className="w-3.5 h-3.5" /> Skipped
               </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-3 text-slate-400 text-sm font-bold ml-4 animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-blue-500">Thinking...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border-t-2 border-slate-100">
        <div className="relative flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Plan a trip..."
            className="w-full pl-5 pr-12 py-3.5 bg-slate-100 border-2 border-transparent focus:bg-white focus:border-blue-400 rounded-2xl text-slate-700 font-medium placeholder:text-slate-400 focus:outline-none transition-all"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className={`
              absolute right-2 p-2 rounded-xl transition-all
              ${!input.trim() || isLoading ? 'text-slate-300' : 'bg-blue-500 text-white hover:bg-blue-600 shadow-md'}
            `}
          >
            <Send className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatAssistant;