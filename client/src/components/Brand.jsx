/**
 * COMP229 - Web Application Development
 * Project: IncidentFlow - Incident Management System
 *
 * Team Members:
 * Ivan Seck Ali - 301501210
 * Robel Teffera - 301113578
 * Ryan Sunil - 301495962
 * Bronson Pearl - 301328703
 *
 * Description:
 * This file is part of the IncidentFlow MERN application.
 */

import { Link } from 'react-router-dom';

// Vite turns this import into the image URL
import teamLogo from '../assets/web-team-six-logo.png';

// the IncidentFlow icon: a line going up to a "resolved" dot
export function BrandMark({ className = 'brand-mark' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" role="img" aria-label="IncidentFlow logo">
      <rect width="32" height="32" rx="8" fill="#1E293B" />
      <path d="M7 21.5 12.5 10l4.5 8 3-4.5L25 21.5" fill="none" stroke="#06B6D4" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="25" cy="21.5" r="2.2" fill="#06B6D4" />
    </svg>
  );
}

// logo + name + tagline, links home (or to the dashboard in the sidebar)
export function Brand({ to = '/', subtitle = 'Report. Track. Resolve.' }) {
  return (
    <Link to={to} className="brand" aria-label="IncidentFlow home">
      <BrandMark />
      <span>
        IncidentFlow
        {subtitle && <small>{subtitle}</small>}
      </span>
    </Link>
  );
}

// our team logo, width and height stop the page jumping while it loads
export function TeamLogo({ className, style }) {
  return <img src={teamLogo} alt="Web Team Six logo" className={className} style={style} width="340" height="138" />;
}
