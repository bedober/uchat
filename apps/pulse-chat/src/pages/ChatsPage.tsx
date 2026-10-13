import { useParams } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { cn } from '@project/components/lib/utils';
import ConversationList from '../components/ConversationList';
import Thread from '../components/Thread';

export default function ChatsPage() {
  const { id } = useParams();
  return (
    <div className="flex h-full">
      <div className={cn('h-full w-full border-r md:w-[340px] md:shrink-0', id && 'hidden md:block')}>
        <ConversationList activeId={id} />
      </div>
      <div className={cn('h-full min-w-0 flex-1', !id && 'hidden md:flex')}>
        {id ? (
          <Thread key={id} conversationId={id} />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <MessageCircle className="h-8 w-8" />
            </div>
            <p className="font-medium">Select a chat to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
