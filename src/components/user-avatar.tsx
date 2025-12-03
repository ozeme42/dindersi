
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/lib/types';
import type { User } from 'firebase/auth';
import { SHOP_ITEMS } from '@/lib/shop-config';

type UserForAvatar = Partial<UserProfile> & Partial<User>;

export function UserAvatar({ user, className }: { user: UserForAvatar | null; className?: string }) {
  if (!user) {
    return <Avatar className={className}><AvatarFallback>?</AvatarFallback></Avatar>;
  }

  const fallbackLetter = user.displayName?.charAt(0) || user.email?.charAt(0) || '?';
  const equippedBadge = SHOP_ITEMS.find(item => item.type === 'avatarBadge' && item.id === user.equippedBadgeId);
  const BadgeIcon = equippedBadge?.component;

  return (
    <div className={cn("relative h-10 w-10 shrink-0", className)}>
      <Avatar className="w-full h-full">
        {BadgeIcon ? (
            <div className="w-full h-full flex items-center justify-center bg-transparent rounded-full">
                 <BadgeIcon className="w-3/4 h-3/4" />
            </div>
        ) : (
            <>
                <AvatarImage src={user.avatar || user.photoURL || undefined} alt={user.displayName || ''} data-ai-hint="profile picture" />
                <AvatarFallback>{fallbackLetter}</AvatarFallback>
            </>
        )}
      </Avatar>
      {user.equippedFrameUrl && (
        <div
          className="absolute inset-[-4px] rounded-full pointer-events-none"
          style={{
            padding: '4px',
            background: user.equippedFrameUrl,
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'exclude',
            maskComposite: 'exclude',
          }}
        />
      )}
    </div>
  );
}
