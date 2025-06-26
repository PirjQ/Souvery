import { motion } from 'framer-motion';

interface LoadingOrbProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingOrb({ size = 'md', className = '' }: LoadingOrbProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <motion.div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg`}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          boxShadow: '0 0 20px rgba(34, 211, 238, 0.5)'
        }}
      />
    </div>
  );
}