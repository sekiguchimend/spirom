'use client';

interface SectionHeaderProps {
  /** ラベルテキスト（大文字表示） */
  label: string;
  /** タイトル（オプション） */
  title?: string;
  /** カラーテーマ */
  theme?: 'primary' | 'white' | 'black';
  /** タイトルのスタイル */
  titleStyle?: React.CSSProperties;
}

const themeClasses = {
  primary: {
    line: 'bg-primary',
    label: 'text-primary',
    title: 'text-text-dark',
  },
  white: {
    line: 'bg-white',
    label: 'text-white',
    title: 'text-white',
  },
  black: {
    line: 'bg-black',
    label: 'text-black',
    title: 'text-black',
  },
};

export function SectionHeader({
  label,
  title,
  theme = 'primary',
  titleStyle,
}: SectionHeaderProps) {
  const colors = themeClasses[theme];

  return (
    <div className="text-center mb-8">
      {/* ラベル部分 */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className={`h-0.5 w-8 ${colors.line}`} />
        <p className={`text-xs tracking-[0.2em] ${colors.label} uppercase font-bold`}>
          {label}
        </p>
        <div className={`h-0.5 w-8 ${colors.line}`} />
      </div>

      {/* タイトル（オプション） */}
      {title && (
        <h2
          className={`text-3xl md:text-4xl font-black ${colors.title}`}
          style={titleStyle || { fontWeight: 900, WebkitTextStroke: '0.5px currentColor' }}
        >
          {title}
        </h2>
      )}
    </div>
  );
}

export default SectionHeader;
