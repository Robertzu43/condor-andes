// Letter-coded pixel art. '.' = transparent. Same letters, two palettes.
const B = '.'.repeat(32);
export const GLIDE = [
".........k......................","........kk..k...................","........kkk.kk.k................",".......kkkkkkkkk................",
".......kkwwkkkkk................","......kkkwwkkkk.................","......kkkwwwkkk.................",".....kkkkwwwkkkk................",
".....kkkkkwwwkkkk...............","....kkkkkkwwwwkkkk..............","....kkkkkkkwwwwkkkk.............","...kkkkkkkkkwwwkkkkk............",
"...kkkkkkkkkkwwkkkkkk.....wrrrr.","..kkkkkkkkkkkkkkkkkkkk....wrrprr","..kkkkkkkkkkkkkkkkkkkkk..wwrrerr",".kkkkkkkkkkkkkkkkkkkkkkkwwwrrrbb",
"kkkkkkkkkkkkkkkkkkkkkkkkwwwrrb..","kkkkggkkkkkkkkkkkkkkkkkkkwww....","kkkggggkkkkkkkkkkkkkkkkkkww.....","kkkgggggkkkkkkkkkkkkkkkkk.......",
".kkggggggkkkkkkkkkkkkkkk........","..kkgggggkkkkkkkkkkkkk..........","...kkkkkkkkkkkkkkkkk............",".....kkkkkkkkkkkkk..............",
".......kkkkkkkkk................",".........kkkkk..................",B,B,B,B,B,B];
export const FLAP = [B,B,B,B,B,B,B,B,B,B,B,B,
"..........................wrrrr.","..........................wrrprr",".........................wwrrerr","....kkkkkkkkkkkkkkkkkkkkwwwrrrbb",
"kkkkkkkkkkkkkkkkkkkkkkkkwwwrrb..","kkkkggkkkkkkkkkkkkkkkkkkkwww....","kkkggggkkkkkkkkkkkkkkkkkkww.....","kkkgggggkkkkkkkkkkkkkkkkk.......",
".kkggggggkkkkkkkkkkkkkkk........","..kkgggggkkkkkkkkkkkkk..........","...kkkkkkwwwkkkkkkkk............",".....kkkkkwwwkkkkk..............",
".......kkkkwwwkkk...............","........kkkkwwkk................","........kkkkwwkk................",".........kkkwwkk................",
".........kkkwwk.................","..........kkkk..................","..........kk.k..................","...........k...................."];
export const COIN = ["....yyyy....","..yyyyyyyy..",".yyyooooyyy.",".yyoooooyyy.","yyooyyyyooyy","yyooyyyyooyy","yyoooooooyyy","yyoooooooyyy",".yyoooooyyy.",".yyyooooyyy.","..yyyyyyyy..","....yyyy...."];

export const PAL = {
  normal: { k: '#1a1a1a', g: '#3d3d3d', w: '#f4f4f4', r: '#c0392b', p: '#e67e22', b: '#e8d8b0', e: '#ffffff', y: '#f2d16b', o: '#e0a020' },
  ultra:  { k: '#1a0533', g: '#3b0a6b', w: '#00f0ff', r: '#ff2a6d', p: '#ff9f1c', b: '#f5f500', e: '#ffffff', y: '#00f0ff', o: '#0a3a5a' },
};
export const OUTLINE = Object.fromEntries(Object.keys(PAL.normal).map(k => [k, '#00f0ff']));

export const THEME = {
  normal: { sky0: '#4aa3e0', sky1: '#b8e3f8', sun: '#ffd93b', sunCore: '#ffb703', far: '#7f93a8', far2: '#9fb3c8', cloud: '#ffffff', cloudShade: '#d6e8f5',
            ground: '#6b8e3a', groundDark: '#4e6b2a', rock: '#7a6a5c', rockDark: '#5c4e42', rockLight: '#8d7d6e', snow: '#ffffff', snow2: '#dde6ee', hud: '#ffffff', glow: '#00f0ff' },
  ultra:  { sky0: '#07010f', sky1: '#2a0a4a', sun: '#ff2a6d', sunCore: '#ff9f1c', far: '#160430', far2: '#24084a', cloud: '#ff2a6d', cloudShade: '#b0104a',
            ground: '#0d0221', groundDark: '#00f0ff', rock: '#1a0533', rockDark: '#0d0221', rockLight: '#3b0a6b', snow: '#ff2a6d', snow2: '#ff6fa0', hud: '#00f0ff', glow: '#00f0ff' },
};

export function drawSprite(ctx, rows, pal, x, y, s = 1) {
  rows.forEach((row, ry) => { for (let rx = 0; rx < row.length; rx++) { const c = pal[row[rx]]; if (c) { ctx.fillStyle = c; ctx.fillRect(x + rx * s, y + ry * s, s, s); } } });
}
