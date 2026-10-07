import {forwardRef} from 'react';
import {Award,CalendarDays,Trophy} from 'lucide-react';
import '../badges.css';

const VictoryBadge=forwardRef(function VictoryBadge({badge,compact=false},ref){return <article ref={ref} className={`victory-badge ${compact?'compact':''}`}>
  <div className="badge-glow one"/><div className="badge-glow two"/>
  <header><div className="victory-seal"><Trophy/></div><div><span>CUST SPORTS WEEK</span><b>CHAMPIONS</b></div><Award className="badge-award"/></header>
  <div className="victory-content"><p>{badge.sportName}</p><h2>{badge.winningTeam}</h2><div className="victory-versus"><span>VICTORY OVER</span><b>{badge.opponentTeam}</b></div>{badge.score&&<div className="victory-score"><small>FINAL SCORE</small><strong>{badge.score}</strong></div>}{(badge.teamCaptain||badge.gameCoordinator)&&<div className="victory-officials">{badge.teamCaptain&&<span><small>TEAM CAPTAIN</small><b>{badge.teamCaptain}</b></span>}{badge.gameCoordinator&&<span><small>GAME COORDINATOR</small><b>{badge.gameCoordinator}</b></span>}</div>}</div>
  <footer><span><CalendarDays/> Batch {badge.batchNumber}</span><span>UNIVERSITY SPORTS · EXCELLENCE</span></footer>
</article>});
export default VictoryBadge;
