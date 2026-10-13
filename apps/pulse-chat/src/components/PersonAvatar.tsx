import { Avatar, AvatarFallback, AvatarImage } from '@project/components/ui/avatar';
import { cn } from '@project/components/lib/utils';
import { Users } from 'lucide-react';

type Props = {
  name: string;
  image?: string | null;
  online?: boolean;
  group?: boolean;
  className?: string;
};

export default function PersonAvatar({ name, image, online, group, className }: Props) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="relative shrink-0">
      <Avatar className={cn('h-11 w-11', className)}>
        {image && <AvatarImage src={image} alt={name} className="object-cover" />}
        <AvatarFallback className={cn('font-semibold', group ? 'bg-secondary text-secondary-foreground' : 'bg-accent text-accent-foreground')}>
          {group ? <Users className="h-5 w-5" /> : initials || '?'}
        </AvatarFallback>
      </Avatar>
      {online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />}
    </div>
  );
}
