'use client';

import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'motion/react';
import { Children, cloneElement, useEffect, useMemo, useRef, useState } from 'react';

import './Dock.css';

function DockItem({ children, className = '', onClick, mousePos, spring, distance, magnification, baseItemSize, label, direction }) {
  const ref = useRef(null);
  const isHovered = useMotionValue(0);

  const rectRef = useRef(null);

  // Cachear el rect para evitar layout thrashing extremo en cada movimiento del mouse
  const updateRect = () => {
    if (ref.current) {
      rectRef.current = ref.current.getBoundingClientRect();
    }
  };

  useEffect(() => {
    updateRect();
    window.addEventListener('resize', updateRect);
    // Actualizar también al hacer scroll por si el dock se movió
    window.addEventListener('scroll', updateRect, { passive: true });
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, []);

  const mouseDistance = useTransform(mousePos, val => {
    const rect = rectRef.current ?? {
      x: 0,
      y: 0,
      width: baseItemSize,
      height: baseItemSize
    };
    return direction === 'vertical' 
      ? val - rect.y - baseItemSize / 2
      : val - rect.x - baseItemSize / 2;
  });

  const targetSize = useTransform(mouseDistance, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize]);
  const size = useSpring(targetSize, spring);

  const handleKeyDown = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <motion.div
      ref={ref}
      style={{
        width: size,
        height: size
      }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      className={`dock-item ${className}`}
      tabIndex={0}
      role="button"
      aria-haspopup="true"
      aria-label={label}
      onKeyDown={handleKeyDown}
    >
      {Children.map(children, child => cloneElement(child, { isHovered }))}
    </motion.div>
  );
}

function DockLabel({ children, className = '', direction = 'horizontal', ...rest }) {
  const { isHovered } = rest;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = isHovered.on('change', latest => {
      setIsVisible(latest === 1);
    });
    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: direction === 'vertical' ? 0 : 0, x: direction === 'vertical' ? -10 : 0 }}
          animate={{ opacity: 1, y: direction === 'vertical' ? 0 : -10, x: direction === 'vertical' ? 10 : 0 }}
          exit={{ opacity: 0, y: 0, x: 0 }}
          transition={{ duration: 0.2 }}
          className={`dock-label ${className} ${direction === 'vertical' ? 'dock-label-vertical' : 'dock-label-horizontal'}`}
          role="tooltip"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DockIcon({ children, className = '' }) {
  return <div className={`dock-icon ${className}`}>{children}</div>;
}

export default function Dock({
  items,
  className = '',
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = 70,
  distance = 200,
  panelHeight = 68,
  dockHeight = 256,
  baseItemSize = 50,
  direction = 'horizontal'
}) {
  const mousePos = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);

  const maxExtent = useMemo(
    () => Math.max(dockHeight, magnification + magnification / 2 + 4),
    [magnification, dockHeight]
  );
  const extentRow = useTransform(isHovered, [0, 1], [panelHeight, maxExtent]);
  const extent = useSpring(extentRow, spring);

  return (
    <motion.div
      onMouseMove={({ pageX, pageY }) => {
        isHovered.set(1);
        mousePos.set(direction === 'vertical' ? pageY : pageX);
      }}
      onMouseLeave={() => {
        isHovered.set(0);
        mousePos.set(Infinity);
      }}
      className={`dock-panel ${direction === 'vertical' ? 'dock-panel-vertical' : 'dock-panel-horizontal'} ${className}`}
      style={{ 
        scrollbarWidth: 'none'
      }}
      role="toolbar"
      aria-label="Application dock"
    >
      {items.map((item, index) => (
          <DockItem
            key={index}
            onClick={item.onClick}
            className={item.className}
            mousePos={mousePos}
            spring={spring}
            distance={distance}
            magnification={magnification}
            baseItemSize={baseItemSize}
            label={item.label}
            direction={direction}
          >
            <DockIcon>{item.icon}</DockIcon>
            <DockLabel direction={direction}>{item.label}</DockLabel>
          </DockItem>
        ))}
    </motion.div>
  );
}
