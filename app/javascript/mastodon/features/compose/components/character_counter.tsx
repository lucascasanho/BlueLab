import { length } from 'stringz';

export const shouldShowCharacterCounter = (
  hidden: boolean,
  current: number,
  max: number,
) => !hidden || current > max;

export const CharacterCounter: React.FC<{
  text: string;
  max: number;
}> = ({ text, max }) => {
  const diff = max - length(text);
  const isLong = Math.abs(diff) >= 1000;
  const className = [
    'character-counter',
    diff < 0 && 'character-counter--over',
    isLong && 'character-counter--long',
  ]
    .filter(Boolean)
    .join(' ');

  if (diff < 0) {
    return <span className={className}>{diff}</span>;
  }

  return <span className={className}>{diff}</span>;
};
