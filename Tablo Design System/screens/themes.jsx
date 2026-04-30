// Tablo · global theme palettes
// Each theme replaces the steel-blue accent with a richer palette including
// secondary colors used for chart categories, deltas, and accent moods.
const THEMES = {
  steel: {
    name: 'A · Steel (current)',
    desc: 'Single steel-blue accent · most restrained',
    accent:      '#1f5fd1',
    accentInk:   '#1748a8',
    accentSoftL: '#eef3fc',
    accentSoftD: '#15233f',
    accentBorderL:'#cbdcf6',
    accentBorderD:'#2c4584',
    // chart series — current is mostly mono
    series: ['#0e1116', '#1f5fd1', '#9aa1ad', '#d6dae1'],
    seriesD:['#f1f3f7', '#5a8bdc', '#7a818d', '#3a4150'],
    // semantic
    pos: '#1f5fd1', neg: '#b54141',
    // UI accents
    bg:'#fbfbfc', bgD:'#0e1116'
  },
  spectrum: {
    name: 'B · Spectrum',
    desc: 'Indigo + coral + amber + teal — distinct hue per category',
    accent:      '#3a44d4',
    accentInk:   '#262d99',
    accentSoftL: '#eef0fc',
    accentSoftD: '#1a1d3a',
    accentBorderL:'#cdd2f3',
    accentBorderD:'#2e3475',
    series: ['#3a44d4', '#e2664a', '#d99a2b', '#1d8a82'],
    seriesD:['#7a83e8', '#ee8a72', '#f0b757', '#46b3aa'],
    pos:'#1d8a82', neg:'#d04545',
    bg:'#fbfbfc', bgD:'#0e1116'
  },
  sunset: {
    name: 'C · Sunset',
    desc: 'Terracotta primary + plum + gold — warm, editorial',
    accent:      '#c84e2c',
    accentInk:   '#9a3a1f',
    accentSoftL: '#fbeee8',
    accentSoftD: '#2a1810',
    accentBorderL:'#f0d2c4',
    accentBorderD:'#5a2d1c',
    series: ['#3b2540', '#c84e2c', '#d4a73a', '#7d4a8c'],
    seriesD:['#8a6e94', '#e87a5a', '#e8c46a', '#a978b9'],
    pos:'#7a8a3a', neg:'#c84e2c',
    bg:'#fcfaf6', bgD:'#15110d'
  },
  citrus: {
    name: 'D · Citrus pop',
    desc: 'Mint primary + coral + lemon — fresh, distinctive',
    accent:      '#1aa37a',
    accentInk:   '#127a5a',
    accentSoftL: '#e6f5ee',
    accentSoftD: '#0e2a20',
    accentBorderL:'#bce5d2',
    accentBorderD:'#1f5240',
    series: ['#1aa37a', '#ef5a5a', '#e8c042', '#3b2540'],
    seriesD:['#4cc59c', '#f47d7d', '#f0d068', '#a59ab5'],
    pos:'#1aa37a', neg:'#ef5a5a',
    bg:'#fbfdfb', bgD:'#0d1411'
  },
};
window.THEMES = THEMES;
