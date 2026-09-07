import React from 'react';
import logo from '../assets/ventspace icon.jpeg';

/**
 * VentSpace brand logo — used across every page.
 * size: pixel width/height (square)
 */
const Logo = ({ size = 40, className = '' }) => (
  <img
    src={logo}
    alt="VentSpace"
    width={size}
    height={size}
    style={{ width: size, height: size }}
    className={`object-cover rounded-xl ring-1 ring-purple-200/60 shadow-glow-sm select-none ${className}`}
    draggable="false"
  />
);

export default Logo;
