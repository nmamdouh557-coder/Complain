import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getKuwaitTime() {
  // Returns a Date object representing the current moment
  return new Date();
}

export function formatKuwaitDate(date: string | Date | null | undefined) {
  if (!date || date === 'N/A') return 'N/A';
  
  let d: Date;
  try {
    if (typeof date === 'string') {
      if (date.includes(' ') && !date.includes('T')) {
        // SQLite format "YYYY-MM-DD HH:MM:SS" -> treat as UTC
        d = new Date(date.replace(' ', 'T') + "Z");
      } else if (date.includes('T') && !date.includes('Z') && !date.includes('+')) {
        // Local format "YYYY-MM-DDTHH:mm" -> treat as Kuwait time
        d = new Date(date + "+03:00");
      } else {
        d = new Date(date);
      }
    } else {
      d = date;
    }
  } catch (e) {
    return 'N/A';
  }
  
  if (isNaN(d.getTime())) return 'N/A';
  
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuwait',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(d).replace(',', '');
}

export function getKuwaitISOString() {
  // We want to return a string that represents the current moment in Kuwait
  // But we'll return it as a proper ISO string with the +03:00 offset
  // to avoid any ambiguity.
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kuwait'
  });
  
  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value;
  
  return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}:${getPart('second')}+03:00`;
}

export function getKuwaitDateTimeLocalString() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kuwait'
  });
  
  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value;
  
  return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}`;
}

export function formatToDateTimeLocal(dateStr: string | Date | null | undefined): string {
  if (!dateStr || dateStr === 'N/A') return '';
  
  let d: Date;
  try {
    if (typeof dateStr === 'string') {
      if (dateStr.includes(' ') && !dateStr.includes('T')) {
        d = new Date(dateStr.replace(' ', 'T') + "Z");
      } else if (dateStr.includes('T') && !dateStr.includes('Z') && !dateStr.includes('+')) {
        d = new Date(dateStr + "+03:00");
      } else {
        d = new Date(dateStr);
      }
    } else {
      d = dateStr;
    }
  } catch (e) {
    return '';
  }

  if (isNaN(d.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kuwait'
  });
  
  const parts = formatter.formatToParts(d);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value;
  
  return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}`;
}

export function calculateDurationInMinutes(start: string | Date | null | undefined, end: string | Date | null | undefined): number | null {
  if (!start || !end || start === 'N/A' || end === 'N/A') return null;
  
  let sDate: Date;
  let eDate: Date;
  
  try {
    // Reusing logic from formatKuwaitDate to parse dates consistently
    const parse = (date: string | Date) => {
      if (typeof date !== 'string') return date;
      if (date.includes(' ') && !date.includes('T')) return new Date(date.replace(' ', 'T') + "Z");
      if (date.includes('T') && !date.includes('Z') && !date.includes('+')) return new Date(date + "+03:00");
      return new Date(date);
    };

    sDate = parse(start);
    eDate = parse(end);
    
    if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) return null;
    
    const diffMs = eDate.getTime() - sDate.getTime();
    return Math.floor(diffMs / (1000 * 60));
  } catch (e) {
    return null;
  }
}
