/* LUMI REELS — all tunable game values live here. No real-money wagering. */
(function (root) {
  'use strict';
  const C = {
    version: 1, release: '1.1',
    initialMedals: 1000, bet: 3, speed: 13.5, brakeSeconds: 0.12,
    maxSlip: 4, slipMin: 3, slipMax: 6, bonusMaxTravel: 6, coinSeconds: 0.035,
    bonusIntroSeconds: 1.65, bonusOutroSeconds: 1.4,
    announcementBeforeChance: 0.5,
    noticeFlashSeconds: 0.25,
    bonus: { BIG: { games: 50 }, REG: { games: 20 } },
    payouts: { GRAPE: 8, CHERRY: 2, BELL: 10, REPLAY: 0, BIG: 0, REG: 0 },
    labels: { MISS: 'ハズレ', BIG: 'BIG', REG: 'REG', GRAPE: 'ぶどう', CHERRY: 'チェリー', BELL: 'ベル', REPLAY: 'リプレイ', STAR: 'スター' },
    // Denominators of mutually exclusive lever draws. These are original game odds.
    settings: [
      { BIG: 240, REG: 360, GRAPE: 6.5, CHERRY: 32, BELL: 96, REPLAY: 7.3 },
      { BIG: 225, REG: 315, GRAPE: 6.4, CHERRY: 32, BELL: 96, REPLAY: 7.3 },
      { BIG: 210, REG: 280, GRAPE: 6.3, CHERRY: 32, BELL: 96, REPLAY: 7.3 },
      { BIG: 195, REG: 245, GRAPE: 6.2, CHERRY: 32, BELL: 96, REPLAY: 7.3 },
      { BIG: 180, REG: 215, GRAPE: 6.1, CHERRY: 32, BELL: 96, REPLAY: 7.3 },
      { BIG: 165, REG: 185, GRAPE: 6.0, CHERRY: 32, BELL: 96, REPLAY: 7.3 }
    ],
    lines: [[0,0,0], [1,1,1], [2,2,2], [0,1,2], [2,1,0]],
    lineNames: ['上段', '中段', '下段', '右下がり', '右上がり'],
    // 24 fixed symbols per reel. STAR is decoration and has no prize.
    // Nonidentical strips also prevent forced, unauthorised wins in a 3-cell stop window.
    strips: [
      ['CHERRY','BIG','GRAPE','STAR','REPLAY','GRAPE','STAR','REPLAY','GRAPE','STAR','STAR','GRAPE','CHERRY','BELL','GRAPE','REPLAY','REG','GRAPE','CHERRY','BELL','GRAPE','REPLAY','BELL','GRAPE'],
      ['STAR','BELL','GRAPE','REG','REPLAY','GRAPE','CHERRY','REPLAY','GRAPE','BIG','REPLAY','GRAPE','CHERRY','BELL','GRAPE','STAR','REPLAY','GRAPE','STAR','STAR','GRAPE','CHERRY','BELL','GRAPE'],
      ['REPLAY','CHERRY','GRAPE','REPLAY','BELL','GRAPE','CHERRY','STAR','GRAPE','BELL','REPLAY','GRAPE','STAR','STAR','GRAPE','STAR','BIG','GRAPE','BELL','REPLAY','GRAPE','REG','CHERRY','GRAPE']
    ]
  };
  root.LUMI_CONFIG = C;
  if (typeof module !== 'undefined' && module.exports) module.exports = C;
})(typeof globalThis !== 'undefined' ? globalThis : window);
