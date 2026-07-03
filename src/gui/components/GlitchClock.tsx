import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from "../config";

interface TimezoneData {
  city: string;
  tz: string;
  abbr: string;
  offset: number;
}

const TIMEZONES: TimezoneData[] = [
  { city: 'Honolulu',   tz: 'Pacific/Honolulu',    abbr: 'HST', offset: -10 },
  { city: 'Los Angeles',tz: 'America/Los_Angeles', abbr: 'PST', offset: -8  },
  { city: 'Denver',     tz: 'America/Denver',      abbr: 'MST', offset: -7  },
  { city: 'Chicago',    tz: 'America/Chicago',     abbr: 'CST', offset: -6  },
  { city: 'New York',   tz: 'America/New_York',    abbr: 'EST', offset: -5  },
  { city: 'São Paulo',  tz: 'America/Sao_Paulo',   abbr: 'BRT', offset: -3  },
  { city: 'London',     tz: 'Europe/London',       abbr: 'GMT', offset: 0   },
  { city: 'Paris',      tz: 'Europe/Paris',        abbr: 'CET', offset: 1   },
  { city: 'Dubai',      tz: 'Asia/Dubai',          abbr: 'GST', offset: 4   },
  { city: 'Mumbai',     tz: 'Asia/Kolkata',        abbr: 'IST', offset: 5.5 },
  { city: 'Tokyo',      tz: 'Asia/Tokyo',          abbr: 'JST', offset: 9   },
  { city: 'Sydney',     tz: 'Australia/Sydney',    abbr: 'AEST',offset: 10  },
];

// Maps browser Intl timezone → which clock block to highlight + what city name to display
// blockCity: the city in TIMEZONES array that matches this timezone
// displayName: what to show instead of the default city name
interface TzInfo { blockCity: string; displayName: string }
const TZ_INFO: Record<string, TzInfo> = {
  // HST (UTC-10)
  'Pacific/Honolulu': { blockCity: 'Honolulu', displayName: 'Honolulu' },
  'America/Anchorage': { blockCity: 'Honolulu', displayName: 'Anchorage' },
  'Pacific/Fiji': { blockCity: 'Honolulu', displayName: 'Suva' },
  // PST (UTC-8)
  'America/Los_Angeles': { blockCity: 'Los Angeles', displayName: 'Los Angeles' },
  'America/Vancouver': { blockCity: 'Los Angeles', displayName: 'Vancouver' },
  'America/Tijuana': { blockCity: 'Los Angeles', displayName: 'Tijuana' },
  // MST (UTC-7)
  'America/Denver': { blockCity: 'Denver', displayName: 'Denver' },
  'America/Edmonton': { blockCity: 'Denver', displayName: 'Edmonton' },
  'America/Phoenix': { blockCity: 'Denver', displayName: 'Phoenix' },
  'America/Boise': { blockCity: 'Denver', displayName: 'Boise' },
  'America/Calgary': { blockCity: 'Denver', displayName: 'Calgary' },
  'America/Yellowknife': { blockCity: 'Denver', displayName: 'Yellowknife' },
  'America/Regina': { blockCity: 'Denver', displayName: 'Regina' },
  // CST (UTC-6)
  'America/Chicago': { blockCity: 'Chicago', displayName: 'Chicago' },
  'America/Mexico_City': { blockCity: 'Chicago', displayName: 'Mexico City' },
  'America/Winnipeg': { blockCity: 'Chicago', displayName: 'Winnipeg' },
  'America/Guatemala': { blockCity: 'Chicago', displayName: 'Guatemala City' },
  // EST (UTC-5)
  'America/New_York': { blockCity: 'New York', displayName: 'New York' },
  'America/Toronto': { blockCity: 'New York', displayName: 'Toronto' },
  'America/Montreal': { blockCity: 'New York', displayName: 'Montreal' },
  'America/Ottawa': { blockCity: 'New York', displayName: 'Ottawa' },
  'America/Havana': { blockCity: 'New York', displayName: 'Havana' },
  'America/Bogota': { blockCity: 'New York', displayName: 'Bogotá' },
  'America/Lima': { blockCity: 'New York', displayName: 'Lima' },
  'America/Panama': { blockCity: 'New York', displayName: 'Panama City' },
  // BRT (UTC-3)
  'America/Sao_Paulo': { blockCity: 'São Paulo', displayName: 'São Paulo' },
  'America/Buenos_Aires': { blockCity: 'São Paulo', displayName: 'Buenos Aires' },
  'America/Santiago': { blockCity: 'São Paulo', displayName: 'Santiago' },
  'America/Montevideo': { blockCity: 'São Paulo', displayName: 'Montevideo' },
  // GMT/UTC±0
  'Europe/London': { blockCity: 'London', displayName: 'London' },
  'Europe/Dublin': { blockCity: 'London', displayName: 'Dublin' },
  'Europe/Lisbon': { blockCity: 'London', displayName: 'Lisbon' },
  'Africa/Casablanca': { blockCity: 'London', displayName: 'Casablanca' },
  'Africa/Accra': { blockCity: 'London', displayName: 'Accra' },
  'Atlantic/Reykjavik': { blockCity: 'London', displayName: 'Reykjavík' },
  // CET (UTC+1)
  'Europe/Paris': { blockCity: 'Paris', displayName: 'Paris' },
  'Europe/Berlin': { blockCity: 'Paris', displayName: 'Berlin' },
  'Europe/Madrid': { blockCity: 'Paris', displayName: 'Madrid' },
  'Europe/Rome': { blockCity: 'Paris', displayName: 'Rome' },
  'Europe/Amsterdam': { blockCity: 'Paris', displayName: 'Amsterdam' },
  'Europe/Brussels': { blockCity: 'Paris', displayName: 'Brussels' },
  'Europe/Vienna': { blockCity: 'Paris', displayName: 'Vienna' },
  'Europe/Stockholm': { blockCity: 'Paris', displayName: 'Stockholm' },
  'Europe/Oslo': { blockCity: 'Paris', displayName: 'Oslo' },
  'Europe/Copenhagen': { blockCity: 'Paris', displayName: 'Copenhagen' },
  'Europe/Prague': { blockCity: 'Paris', displayName: 'Prague' },
  'Europe/Warsaw': { blockCity: 'Paris', displayName: 'Warsaw' },
  'Europe/Budapest': { blockCity: 'Paris', displayName: 'Budapest' },
  'Europe/Zurich': { blockCity: 'Paris', displayName: 'Zurich' },
  'Europe/Athens': { blockCity: 'Paris', displayName: 'Athens' },
  'Europe/Helsinki': { blockCity: 'Paris', displayName: 'Helsinki' },
  'Africa/Lagos': { blockCity: 'Paris', displayName: 'Lagos' },
  'Africa/Cairo': { blockCity: 'Paris', displayName: 'Cairo' },
  'Africa/Johannesburg': { blockCity: 'Paris', displayName: 'Johannesburg' },
  // GST (UTC+4)
  'Asia/Dubai': { blockCity: 'Dubai', displayName: 'Dubai' },
  'Asia/Muscat': { blockCity: 'Dubai', displayName: 'Muscat' },
  'Asia/Baku': { blockCity: 'Dubai', displayName: 'Baku' },
  // IST (UTC+5:30)
  'Asia/Kolkata': { blockCity: 'Mumbai', displayName: 'Mumbai' },
  'Asia/Colombo': { blockCity: 'Mumbai', displayName: 'Colombo' },
  'Asia/Kathmandu': { blockCity: 'Mumbai', displayName: 'Kathmandu' },
  'Asia/Dhaka': { blockCity: 'Mumbai', displayName: 'Dhaka' },
  // JST (UTC+9)
  'Asia/Tokyo': { blockCity: 'Tokyo', displayName: 'Tokyo' },
  'Asia/Seoul': { blockCity: 'Tokyo', displayName: 'Seoul' },
  'Asia/Shanghai': { blockCity: 'Tokyo', displayName: 'Shanghai' },
  'Asia/Hong_Kong': { blockCity: 'Tokyo', displayName: 'Hong Kong' },
  'Asia/Taipei': { blockCity: 'Tokyo', displayName: 'Taipei' },
  'Asia/Singapore': { blockCity: 'Tokyo', displayName: 'Singapore' },
  // AEST (UTC+10)
  'Australia/Sydney': { blockCity: 'Sydney', displayName: 'Sydney' },
  'Australia/Melbourne': { blockCity: 'Sydney', displayName: 'Melbourne' },
  'Australia/Brisbane': { blockCity: 'Sydney', displayName: 'Brisbane' },
  'Australia/Perth': { blockCity: 'Sydney', displayName: 'Perth' },
};

// Map exit country names to TIMEZONES city blocks
const EXIT_COUNTRY_TO_CITY: Record<string, string> = {
  'Germany': 'Paris', 'Netherlands': 'Paris', 'France': 'Paris',
  'Sweden': 'London', 'Switzerland': 'Paris', 'Japan': 'Tokyo',
  'Singapore': 'Tokyo', 'United Kingdom': 'London', 'UK': 'London',
  'Romania': 'Paris', 'Canada': 'Toronto', 'Australia': 'Sydney',
  'Brazil': 'São Paulo', 'India': 'Mumbai', 'Argentina': 'São Paulo',
  'US': 'New York', 'United States': 'New York', 'America': 'New York',
};

const CHARS = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function formatTime(tzName: string): string {
  try {
    return new Date().toLocaleTimeString('en-US', { timeZone: tzName, hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '--:--:--';
  }
}

function getDate(tzName: string): string {
  try {
    return new Date().toLocaleDateString('en-US', { timeZone: tzName, month: 'short', day: 'numeric' });
  } catch {
    return '---';
  }
}

function glitchChar(): string {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

function glitchTime(time: string, intensity: number): string {
  return time.split('').map(c => Math.random() < intensity ? glitchChar() : c).join('');
}

function getBrowserTzInfo(): TzInfo | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log('[GlitchClock] Browser timezone:', tz);
    if (TZ_INFO[tz]) {
      console.log('[GlitchClock] Matched:', TZ_INFO[tz]);
      return TZ_INFO[tz];
    }
  } catch {}
  // Fallback: UTC offset
  const offset = -new Date().getTimezoneOffset() / 60;
  const closest = TIMEZONES.reduce((prev, curr) =>
    Math.abs(curr.offset - offset) < Math.abs(prev.offset - offset) ? curr : prev
  );
  console.log('[GlitchClock] Offset fallback:', closest.city);
  return { blockCity: closest.city, displayName: closest.city };
}

// Free IP geolocation — detects your PHYSICAL location regardless of system clock
async function getLocationTzInfo(): Promise<TzInfo | null> {
  try {
    const r = await fetch('https://ip-api.com/json/?fields=timezone,city,country');
    const d = await r.json();
    if (d.timezone && TZ_INFO[d.timezone]) {
      console.log('[GlitchClock] IP geolocation:', d.timezone, '→', TZ_INFO[d.timezone], `(${d.city}, ${d.country})`);
      return TZ_INFO[d.timezone];
    }
    if (d.timezone) {
      // Try matching by offset
      console.log('[GlitchClock] IP timezone not in map:', d.timezone, '- falling back');
    }
    return null;
  } catch (e) {
    console.log('[GlitchClock] IP geolocation failed:', e);
    return null;
  }
}

export default function GlitchClock() {
  const [time, setTime] = useState<string[]>(TIMEZONES.map(tz => formatTime(tz.tz)));
  const [dates, setDates] = useState<string[]>(TIMEZONES.map(tz => getDate(tz.tz)));
  const [glitchIntensity, setGlitchIntensity] = useState(0);
  const [glitchRow, setGlitchRow] = useState<number | null>(null);
  const [browserInfo, setBrowserInfo] = useState<TzInfo | null>(() => getBrowserTzInfo());

  // Override browser timezone with IP-based physical location detection
  useEffect(() => {
    getLocationTzInfo().then(ipInfo => {
      if (ipInfo) {
        const browserCity = browserInfo?.blockCity;
        if (browserCity !== ipInfo.blockCity) {
          console.log('[GlitchClock] IP says:', ipInfo, 'overriding browser:', browserInfo);
          setBrowserInfo(ipInfo);
        }
      }
    });
  }, []);
  const [exitInfo, setExitInfo] = useState<TzInfo | null>(null);
  const [proxyInfo, setProxyInfo] = useState<TzInfo | null>(null);

  useEffect(() => {
    const checkExit = async () => {
      try {
        const [torRes, proxyRes] = await Promise.all([
          fetch(API_URL + '/api/tor/check-ip'),
          fetch(API_URL + '/api/rotating-proxy/status'),
        ]);
        const torData = await torRes.json();
        const proxyData = await proxyRes.json();

        // TOR takes priority — use country name directly, not IP geolocation
        if (torData.torified) {
          setProxyInfo(null);
          const fallbackCity = EXIT_COUNTRY_TO_CITY[torData.exit_country] || '';
          const displayName = torData.exit_country || fallbackCity;
          setExitInfo(fallbackCity ? { blockCity: fallbackCity, displayName, } : null);
        } else {
          setExitInfo(null);
        }

        // Proxy (only if TOR not active)
        if (!torData.torified && proxyData?.active && proxyData?.current_proxy) {
          const cp = proxyData.current_proxy;
          const country = cp.country || '';
          const city = EXIT_COUNTRY_TO_CITY[country] || '';
          setProxyInfo(city ? { blockCity: city, displayName: country } : null);
        } else {
          setProxyInfo(null);
        }
      } catch {}
    };
    checkExit();
    const id = setInterval(checkExit, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setTime(TIMEZONES.map(tz => formatTime(tz.tz)));
      setDates(TIMEZONES.map(tz => getDate(tz.tz)));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const burst = () => {
      setGlitchRow(Math.floor(Math.random() * TIMEZONES.length));
      setGlitchIntensity(0.6 + Math.random() * 0.3);
      setTimeout(() => { setGlitchIntensity(0); setGlitchRow(null); }, 150 + Math.random() * 200);
    };
    const id = setInterval(burst, 2500 + Math.random() * 3000);
    const id2 = setInterval(() => {
      if (Math.random() > 0.5) { setGlitchIntensity(0.15); setTimeout(() => setGlitchIntensity(0), 80); }
    }, 800);
    return () => { clearInterval(id); clearInterval(id2); };
  }, []);

  const userBlockCity = browserInfo?.blockCity || '';
  const userDisplayCity = browserInfo?.displayName || '';

  const getCityName = (tz: TimezoneData): string => {
    if (userBlockCity === tz.city && userDisplayCity) return userDisplayCity;
    if (exitInfo?.blockCity === tz.city && exitInfo.displayName) return exitInfo.displayName;
    if (proxyInfo?.blockCity === tz.city && proxyInfo.displayName) return proxyInfo.displayName;
    return tz.city;
  };

  const getTitleColor = (city: string): string => {
    if (city === 'London') return '#ffd700';
    if (userBlockCity === city) return '#00d4ff';
    if (exitInfo?.blockCity === city) return '#ff6ec7';
    if (proxyInfo?.blockCity === city) return '#ffaa00';
    return '#555';
  };

  const getBlockBorder = (city: string): string => {
    if (city === 'London') return 'rgba(255,215,0,0.15)';
    if (userBlockCity === city) return 'rgba(0,212,255,0.15)';
    if (exitInfo?.blockCity === city) return 'rgba(255,110,199,0.15)';
    if (proxyInfo?.blockCity === city) return 'rgba(255,170,0,0.15)';
    return 'rgba(0, 255, 136, 0.04)';
  };

  const getTimeColor = (city: string): string => {
    if (city === 'London') return '#ffd700';
    if (userBlockCity === city) return '#00d4ff';
    if (exitInfo?.blockCity === city) return '#ff6ec7';
    if (proxyInfo?.blockCity === city) return '#ffaa00';
    return '#00ff88';
  };

  const getLabelColor = (city: string): string => {
    if (city === 'London') return '#ffd70080';
    if (userBlockCity === city) return '#00d4ff80';
    if (exitInfo?.blockCity === city) return '#ff6ec780';
    if (proxyInfo?.blockCity === city) return '#ffaa0080';
    return '#334';
  };

  const getDateColor = (city: string): string => {
    if (city === 'London') return '#554400';
    if (userBlockCity === city) return '#004455';
    if (exitInfo?.blockCity === city) return '#440044';
    if (proxyInfo?.blockCity === city) return '#443300';
    return '#222';
  };

  const getIcon = (city: string): string => {
    if (city === 'London') return '⭐';
    if (userBlockCity === city) return '📍';
    if (exitInfo?.blockCity === city) return '🔄';
    if (proxyInfo?.blockCity === city) return '🔗';
    return '';
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.row}>
        {TIMEZONES.map((tz, i) => {
          const isGlitching = i === glitchRow || (glitchIntensity > 0 && Math.random() < glitchIntensity * 0.1);
          const displayTime = isGlitching ? glitchTime(time[i], glitchIntensity) : time[i];
          const displayCity = getCityName(tz);
          const icon = getIcon(tz.city);
          const c = tz.city; // original city for lookup
          const titleColor = getTitleColor(c);
          const timeColor = getTimeColor(c);
          const labelColor = getLabelColor(c);
          const dateColor = getDateColor(c);
          const borderColor = getBlockBorder(c);
          const isUserBlock = userBlockCity === c;
          const isExitBlock = exitInfo?.blockCity === c;
          const isProxyBlock = proxyInfo?.blockCity === c;
          const isGMT = c === 'London';
          const isSpecial = isGMT || isUserBlock || isExitBlock || isProxyBlock;

          return (
            <div key={tz.tz} style={{ ...styles.tzBlock, borderColor }}>
              <div style={{ ...styles.city, color: titleColor }}>
                {displayCity}
                <span style={{ marginLeft: 2, fontSize: 7, opacity: 0.8 }}>{tz.abbr}</span>
                {isSpecial && <span style={{ marginLeft: 1, fontSize: 7 }}>{icon}</span>}
              </div>
              <div style={{ ...styles.time, color: isGlitching ? '#ff6ec7' : timeColor, textShadow: isSpecial ? `0 0 10px ${timeColor}40` : '0 0 8px rgba(0, 255, 136, 0.2)' }}>
                {displayTime}
              </div>
              <div style={styles.meta}>
                <span style={{ ...styles.abbr, color: labelColor }}>{tz.abbr}</span>
                <span style={{ ...styles.date, color: dateColor }}>{dates[i]}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { width: '100%', overflow: 'hidden' },
  row: { display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' as const },
  tzBlock: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '6px 8px', background: 'rgba(6, 6, 14, 0.4)',
    borderRadius: 6, border: '1px solid', minWidth: 80,
  },
  city: {
    fontSize: 8, fontFamily: "'JetBrains Mono', monospace",
    textTransform: 'uppercase' as const, letterSpacing: 0.5,
    marginBottom: 2, whiteSpace: 'nowrap' as const, display: 'flex', alignItems: 'center', gap: 2,
  },
  time: {
    fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: 1, transition: 'color 0.05s',
  },
  meta: { display: 'flex', gap: 4, marginTop: 1 },
  abbr: { fontSize: 7, fontFamily: "'JetBrains Mono', monospace" },
  date: { fontSize: 7, fontFamily: "'JetBrains Mono', monospace" },
};
