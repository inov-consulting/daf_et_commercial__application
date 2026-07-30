'use client';

interface NotificationItem {
  id: string;
  event: string;
  description: string;
  channels: {
    email: boolean;
    push: boolean;
    sms: boolean;
    inApp: boolean;
  };
}

interface NotificationTableProps {
  title: string;
  items: NotificationItem[];
  category: string;
  onToggle: (category: string, id: string, channel: string) => void;
}

export function NotificationTable({ title, items, category, onToggle }: NotificationTableProps) {
  const channels = ['email', 'push', 'sms', 'inApp'] as const;
  const channelLabels = {
    email: 'Email',
    push: 'Push',
    sms: 'SMS',
    inApp: 'In-app',
  };

  return (
    <div className="bg-white border border-[#DDE5EF] rounded-xl overflow-hidden mb-4">
      <div className="px-5 py-2.5 font-space-grotesk text-xs font-semibold text-[#2E3D4C] border-b border-[#EEF2F7] bg-[#F7F9FC]">
        {title}
      </div>
      
      <div className="grid grid-cols-[1fr_repeat(4,70px)] gap-0 px-5 py-2.5 bg-[#EEF2F7] border-b border-[#DDE5EF]">
        <div className="font-inter text-[11px] font-semibold text-[#7691A8] text-left">Événement</div>
        {channels.map((channel) => (
          <div key={channel} className="font-inter text-[11px] font-semibold text-[#7691A8] text-center">
            {channelLabels[channel]}
          </div>
        ))}
      </div>
      
      {items.map((item) => (
        <div key={item.id} className="grid grid-cols-[1fr_repeat(4,70px)] gap-0 px-5 py-3 border-b border-[#EEF2F7] last:border-none items-center">
          <div>
            <div className="font-inter text-[13px] font-medium text-[#1B2633]">{item.event}</div>
            <div className="font-inter text-[11px] text-[#7691A8] mt-0.5">{item.description}</div>
          </div>
          {channels.map((channel) => (
            <div key={channel} className="flex justify-center items-center">
              <label className="relative w-7 h-4 flex-shrink-0">
                <input 
                  type="checkbox" 
                  checked={item.channels[channel]}
                  onChange={() => onToggle(category, item.id, channel)}
                  className="opacity-0 w-0 h-0 absolute"
                />
                <div className={`
                  absolute inset-0 rounded-lg cursor-pointer transition-colors duration-200
                  ${item.channels[channel] ? 'bg-primary' : 'bg-[#C8D5E0]'}
                `} />
                <div className={`
                  absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white
                  transition-transform duration-200 pointer-events-none
                  ${item.channels[channel] ? 'translate-x-3' : ''}
                `} />
              </label>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}