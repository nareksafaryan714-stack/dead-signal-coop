export const WORLD_LIMIT=23.2;
const car=(x,z,a)=>({x,z,w:Math.abs(Math.sin(a))*4.4+Math.abs(Math.cos(a))*2.3,d:Math.abs(Math.cos(a))*4.4+Math.abs(Math.sin(a))*2.3});
export const COLLIDERS=[
 ...[[-12,-13],[12,13],[14,-16]].map(([x,z])=>({x,z,w:5.2,d:2.7})),
 ...[[-8,-12,1.4],[-8,-14,1.1],[16,10,1.4],[-16,12,1.1],[10,-13,1]].map(([x,z,s])=>({x,z,w:s,d:s})),
 {x:-8,z:3,w:1,d:3.4},{x:7,z:-6,w:3.4,d:1},{x:8,z:8,w:1,d:3.4},{x:-5,z:15,w:3.4,d:1},
 car(-3,-13,.12),car(13,2,1.7),car(-14,9,-.4),
 ...[[10,15],[11,15.6],[-17,-11],[-16,-11.5]].map(([x,z])=>({x,z,w:.85,d:.85}))
];
export function canMove(x,z,r=.4){return Math.abs(x)<WORLD_LIMIT-r&&Math.abs(z)<WORLD_LIMIT-r&&!COLLIDERS.some(o=>x+r>o.x-o.w/2&&x-r<o.x+o.w/2&&z+r>o.z-o.d/2&&z-r<o.z+o.d/2);}
export function move(p,dx,dz,r=.4){if(canMove(p.x+dx,p.z,r))p.x+=dx;if(canMove(p.x,p.z+dz,r))p.z+=dz;}
export function rayBox(x,z,dx,dz,o,max){let low=0,high=max;for(const [v,d,lo,hi] of [[x,dx,o.x-o.w/2,o.x+o.w/2],[z,dz,o.z-o.d/2,o.z+o.d/2]]){if(Math.abs(d)<.0001){if(v<lo||v>hi)return max;}else{let a=(lo-v)/d,b=(hi-v)/d;if(a>b)[a,b]=[b,a];low=Math.max(low,a);high=Math.min(high,b);if(high<low)return max;}}return low>0?low:max;}
export function hitDistance(x,z,dx,dz,max=35){for(const o of COLLIDERS)max=Math.min(max,rayBox(x,z,dx,dz,o,max));return max;}
export const UPGRADE_DEFS=[
 {id:'damage',icon:'↗',name:'БРОНЕБОЙНЫЕ',desc:'Урон каждого выстрела +30%'},
 {id:'health',icon:'+',name:'ВТОРОЕ ДЫХАНИЕ',desc:'Максимум здоровья +35. Полное лечение.'},
 {id:'rate',icon:'≋',name:'БЫСТРЫЙ ЗАТВОР',desc:'Скорострельность +25%'},
 {id:'mag',icon:'▥',name:'БОЛЬШЕ ПАТРОНОВ',desc:'+12 патронов. Перезарядка быстрее на 20%.'},
 {id:'speed',icon:'ϟ',name:'ЛЁГКИЙ ШАГ',desc:'Скорость передвижения +18%'}
];
export const PLAYER_COLORS=['#def394','#79d9ed','#d7a1f4','#f6b279'];
