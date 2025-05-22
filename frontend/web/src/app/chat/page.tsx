"use client";

import React, { useReducer, useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils'; // Import the cn utility
import ChatMessages from './_components/chat-messages'; // Renamed component
import ChatInput from './_components/chat-input';
import { ChevronDown, Home, RotateCcw } from 'lucide-react'; // Added RotateCcw Icon for scroll button and Home icon
// import { useTypingEffect } from '@/hooks/useTypingEffect'; // Remove hook import

// --- Interfaces (Revert Message interface) --- 
interface Message {
  id: string;
  role: 'user' | 'assistant'; 
  content: string; // Back to just content
  agentName?: string; 
  isLoading?: boolean; 
}

interface ChatMessageInput {
  role: string;
  content: string;
}

// --- Reducer Logic (Revert changes) --- 

interface ChatState {
    messages: { [id: string]: Message }; 
    messageOrder: string[];
    isLoading: boolean;
    loadingMessageId: string | null; 
    currentAssistantMessageId: string | null; 
}

type ChatAction =
    | { type: 'START_ASSISTANT_MESSAGE'; payload: { id: string; agentName?: string } }
    | { type: 'APPEND_DELTA'; payload: { id: string; delta: string } } // Back to APPEND_DELTA
    // | { type: 'UPDATE_DISPLAYED_CONTENT'; payload: { id: string; newContent: string } } // Remove this
    | { type: 'UPDATE_AGENT_NAME'; payload: { id: string; agentName: string } }
    | { type: 'COMPLETE_ASSISTANT_MESSAGE'; payload: { id: string } }
    | { type: 'ADD_USER_MESSAGE'; payload: Message }
    | { type: 'SET_ERROR'; payload: { errorContent: string } }
    | { type: 'RESET_CHAT' }; // Add reset action type

const initialState: ChatState = {
    messages: {},
    messageOrder: [],
    isLoading: false,
    loadingMessageId: null,
    currentAssistantMessageId: null,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
    switch (action.type) {
        case 'ADD_USER_MESSAGE':
             // Revert - just add the message as is
            return {
                ...state,
                isLoading: true, 
                messages: { ...state.messages, [action.payload.id]: action.payload },
                messageOrder: [...state.messageOrder, action.payload.id],
            };

        case 'START_ASSISTANT_MESSAGE':
            const newMessage: Message = {
                id: action.payload.id,
                role: 'assistant',
                content: '', // Start empty
                agentName: action.payload.agentName || 'Assistant',
                isLoading: true, 
            };
            return {
                ...state,
                isLoading: true, // Ensure global loading state is active
                currentAssistantMessageId: action.payload.id, 
                loadingMessageId: action.payload.id, 
                messages: { ...state.messages, [action.payload.id]: newMessage },
                messageOrder: [...state.messageOrder, action.payload.id],
            };

        case 'APPEND_DELTA': // Renamed back
            if (!state.messages[action.payload.id] || state.loadingMessageId !== action.payload.id) return state;
            const msgToAppend = state.messages[action.payload.id];
            return {
                ...state,
                messages: {
                    ...state.messages,
                    [action.payload.id]: {
                        ...msgToAppend,
                        content: msgToAppend.content + action.payload.delta, // Update content directly
                    }
                }
            };
        
        // case 'UPDATE_DISPLAYED_CONTENT': // Remove this case
        //     return state; // Or handle appropriately if needed elsewhere

        case 'UPDATE_AGENT_NAME':
             if (!state.messages[action.payload.id] || state.loadingMessageId !== action.payload.id) return state;
             const msgToUpdateAgent = state.messages[action.payload.id];
            return {
                ...state,
                messages: {
                    ...state.messages,
                    [action.payload.id]: {
                        ...msgToUpdateAgent,
                        agentName: action.payload.agentName,
                    }
                }
            };

        case 'COMPLETE_ASSISTANT_MESSAGE':
            if (state.loadingMessageId !== action.payload.id) return state;
            const completedMsg = state.messages[action.payload.id];
            const updatedMessages = completedMsg ? { 
                ...state.messages, 
                [action.payload.id]: { ...completedMsg, isLoading: false } // Just set isLoading false
            } : state.messages;
            
            return {
                ...state,
                messages: updatedMessages,
                isLoading: false, // Deactivate global loading state
                loadingMessageId: null,
                currentAssistantMessageId: null,
            };
        
        case 'SET_ERROR':
             const errorId = `error-${Date.now()}`;
             const errorMessage: Message = {
                 id: errorId,
                 role: 'assistant',
                 content: `Error: ${action.payload.errorContent}`, // Back to content
                 agentName: 'System Error'
             };
            return {
                ...state,
                isLoading: false,
                loadingMessageId: null,
                currentAssistantMessageId: null,
                messages: { ...state.messages, [errorId]: errorMessage },
                messageOrder: [...state.messageOrder, errorId],
            };

        case 'RESET_CHAT': // Add reset case
            console.log("Resetting chat state...");
            return initialState;

        default:
            return state;
    }
}

const TYPING_SPEED_MS = 30; // Milliseconds per chunk for simulated typing

const simulateTyping = (
    dispatch: React.Dispatch<ChatAction>,
    messageId: string,
    fullContent: string,
    agentName?: string
) => {
    if (agentName) {
        dispatch({ type: 'UPDATE_AGENT_NAME', payload: { id: messageId, agentName } });
    }

    // Split content into small chunks (e.g., characters or words)
    // Splitting by character for a smoother, more granular typing effect
    const chunks = fullContent.split(''); 
    let currentChunkIndex = 0;

    function typeNextChunk() {
        if (currentChunkIndex < chunks.length) {
            const delta = chunks[currentChunkIndex];
            dispatch({ type: 'APPEND_DELTA', payload: { id: messageId, delta } });
            currentChunkIndex++;
            setTimeout(typeNextChunk, TYPING_SPEED_MS);
        } else {
            dispatch({ type: 'COMPLETE_ASSISTANT_MESSAGE', payload: { id: messageId } });
        }
    }
    typeNextChunk();
};

// --- Page Component --- 
export default function ChatPage() {
    const [state, dispatch] = useReducer(chatReducer, initialState);
    const { messages, messageOrder, isLoading, loadingMessageId } = state;
    const orderedMessages = useMemo(() => 
        messageOrder.map(id => messages[id]).filter(Boolean)
    , [messageOrder, messages]);
    const hasStarted = state.messageOrder.length > 0;

    // Ref for the scrollable message container
    const scrollRef = useRef<HTMLDivElement>(null);
    // Ref for the sentinel element at the end of messages
    const endOfMessagesRef = useRef<HTMLDivElement>(null);
    // State to track if scroll is at the bottom
    const [isAtBottom, setIsAtBottom] = useState(true);
    // State to control visibility of scroll to bottom button
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [chatInput, setChatInput] = useState(''); // Added for controlled ChatInput

    // Refs for scroll behavior management
    const userJustSentRef = useRef(false); 
    const lastUserSend = useRef<number>(0);

    // Helper to scroll the sentinel into view (guaranteed to exist when chat has started)
    const scrollMessagesToBottom = useCallback((smooth: boolean = true) => {
        if (endOfMessagesRef.current) {
            endOfMessagesRef.current.scrollIntoView({
                behavior: smooth ? 'smooth' : 'auto',
                block: 'start',
            });
        } else if (scrollRef.current) {
            // Fallback: manual scroll
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, []);

    // Scroll to bottom effect (keep as is for now, depends on loadingMessageId)
    useEffect(() => {
        if (Date.now() - lastUserSend.current < 300) return;
        // Note: This still scrolls based on loadingMessageId, which might need adjustment
        // if we want it purely based on the IntersectionObserver state later.
        if (scrollRef.current && loadingMessageId) { 
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [orderedMessages.length, loadingMessageId]);

    // Define handleScroll at the component level
    const handleScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120; // Threshold for showing button
        setIsAtBottom(atBottom);
        setShowScrollButton(!atBottom);
    }, [scrollRef]); // Dependency: scrollRef

    // Scroll listener effect
    useEffect(() => {
        const el = scrollRef.current;
        if (!hasStarted || !el) return;

        el.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Initial check to set button visibility

        return () => {
            el.removeEventListener('scroll', handleScroll);
        };
    }, [hasStarted, scrollRef, handleScroll]); // Added handleScroll to dependencies

    // Auto-scroll after every new message
    useEffect(() => {
        // Keep view pinned to bottom while assistant streaming, unless user scrolled up.
        if (!userJustSentRef.current && isAtBottom) {
            scrollMessagesToBottom(false);
        }
        // reset signal
        if (userJustSentRef.current) userJustSentRef.current = false;
    }, [messageOrder, isAtBottom, scrollMessagesToBottom]);

    const scrollToBottom = () => {
        if (scrollRef.current) {
             scrollRef.current.scrollTo({
                 top: scrollRef.current.scrollHeight,
                 behavior: 'smooth'
             });
        }
    };

    // Add handler for resetting chat
    const handleReset = useCallback(() => {
        // Could add confirmation dialog here if desired
        dispatch({ type: 'RESET_CHAT' });
    }, [dispatch]);

    const handleSendMessage = useCallback(async (currentInput: string) => {
        if (!currentInput.trim()) return;

        const userInput: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: currentInput,
        };
        dispatch({ type: 'ADD_USER_MESSAGE', payload: userInput });
        
        userJustSentRef.current = true;
        lastUserSend.current = Date.now();

        const assistantMessageId = `assistant-${Date.now()}`;
        dispatch({ 
            type: 'START_ASSISTANT_MESSAGE', 
            payload: { id: assistantMessageId, agentName: 'Assistant' } 
        });

        // --- Original backend call (now targeting the simple test backend) ---
        try {
            const response = await fetch('http://localhost:8001/chat', { // <<< CHANGED TO PORT 8001
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ user_message: currentInput }), 
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || `API request failed with status ${response.status}`);
            }

            const data = await response.json();
            // The simple backend returns: {"role": "assistant", "content": "Simple backend confirmation: I received 'user_message'"}
            // We can use its role and content directly, or simulate typing as before.
            // For this test, let's keep the simulateTyping to ensure that part is also re-tested.
            simulateTyping(dispatch, assistantMessageId, data.content, data.role); // Pass role as agentName

        } catch (error) {
            console.error("Failed to send message to simple backend:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred with simple backend";
            dispatch({ type: 'SET_ERROR', payload: { errorContent: errorMessage } });
        }
    }, [dispatch]);

    // Effect for initial welcome message
    useEffect(() => {
        // Only run once on mount if no messages exist
        if (state.messageOrder.length === 0) {
            const welcomeMessageId = `assistant-welcome-${Date.now()}`;
            const welcomeText = "Hello! I'm your AI Assistant, powered by a JSON API. How can I help you today?";
            
            // Start assistant message (sets loading state, creates placeholder)
            // The reducer for START_ASSISTANT_MESSAGE will set global isLoading to true
            dispatch({ 
                type: 'START_ASSISTANT_MESSAGE', 
                payload: { id: welcomeMessageId, agentName: 'AI Assistant' } 
            });
            
            // Simulate typing for the welcome message
            simulateTyping(dispatch, welcomeMessageId, welcomeText, 'AI Assistant');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch]); // Removed state.messageOrder.length from deps to ensure it runs only once as intended initially

    return (
        <div className="flex flex-col h-[calc(100dvh-0px)] bg-white dark:bg-gray-900">
            {/* Header */}
            <header className="sticky top-0 z-10 flex items-center justify-between p-3 border-b bg-white dark:bg-gray-800 shadow-sm h-[60px]">
                <h1 className="text-xl font-semibold text-gray-800 dark:text-white">AI Agent UI</h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleReset}
                        className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-sm flex items-center gap-1.5"
                        aria-label="Clear chat"
                    >
                        <RotateCcw size={16}/>
                        Clear Chat
                    </button>
                    <a
                        href="/" // Assuming home is the root
                        className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-sm flex items-center gap-1.5"
                        aria-label="Go to Home"
                    >
                        <Home size={16}/>
                        Home
                    </a>
                </div>
            </header>

            {/* Message Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-850 scroll-smooth" // Added scroll-smooth
                onScroll={handleScroll}
            >
                <ChatMessages messages={orderedMessages} loadingMessageId={loadingMessageId} />
                <div ref={endOfMessagesRef} />
            </div>
            
            {/* Scroll to bottom button */}
            {hasStarted && !isAtBottom && (
                 <button
                    onClick={scrollToBottom}
                    className="fixed bottom-20 right-4 z-20 p-2 bg-gray-700 dark:bg-gray-200 text-white dark:text-black rounded-full shadow-lg hover:bg-gray-800 dark:hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-600 dark:focus:ring-gray-400 transition-opacity duration-300"
                    aria-label="Scroll to bottom"
                 >
                     <ChevronDown size={20} />
                 </button>
            )}

            {/* Input Area - pass chatInput and setChatInput for controlled component */}
            <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                 <ChatInput
                    onSendMessage={handleSendMessage}
                    onReset={handleReset}
                    isLoading={isLoading}
                    // The 'sticky' prop could be controlled by state if needed, or set directly.
                    // For now, assuming it's managed internally or passed if ChatPage had such a prop.
                    // For this refactor, I'm focusing on the core logic.
                    // Let's make it sticky by default as per typical chat UIs.
                    sticky={true} 
                />
            </div>
        </div>
    );
} 