import { MessageCircle, X } from 'lucide-react';

interface FloatingChatButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export function FloatingChatButton({ onClick, isOpen }: FloatingChatButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-200 ${isOpen ? 'rotate-90' : ''}`}
      aria-label={isOpen ? "Close chat" : "Open AI assistant"}
    >
      {isOpen ? (
        <X className="w-6 h-6 text-white" />
      ) : (
        <MessageCircle className="w-6 h-6 text-white" />
      )}
    </button>
  );
}
