import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const dir = fileURLToPath(new URL('.', import.meta.url));
const palettes = {
 amber:['#FFF5D8','#F2CD72','#A85A16','#F5BB45'],
 teal:['#EAF8F5','#AFE0D7','#237F77','#8ED1C5'],
 blue:['#EAF5FF','#B1D7F4','#2675AC','#B7DFFA'],
 green:['#EDF8EE','#BDE3C3','#31834B','#B4DDBC'],
 slate:['#F2F4F8','#D4DCE7','#65758E','#D8E0EB'],
 purple:['#F0EDFF','#CFC4F6','#7352B3','#AC91E3']
};
const defs = [
 ['courses','รายวิชาที่สอน','หนังสือเรียนซ้อนกัน แทนชุดรายวิชา','amber',`<path d="M19 13h27v34H19a5 5 0 0 1-5-5V18a5 5 0 0 1 5-5Z" fill="white"/><path d="M19 13v27M19 40h27M14 42a5 5 0 0 1 5-2M20 51h30V20"/><path d="M34 14v15l4-3 4 3V14" fill="ACCENT"/><path d="M25 33h12"/>`],
 ['classrooms','ห้องเรียนทั้งหมด','กระดานและที่นั่ง แทนห้องเรียน','teal',`<rect x="12" y="13" width="40" height="26" rx="4" fill="white"/><path d="M20 22h17M20 28h10M32 39v7M24 46h16"/><path d="M12 53v-4a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v4M42 53v-4a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v4"/><path d="M43 33h4" stroke="ACCENT"/>`],
 ['students','นักเรียนทั้งหมด','กลุ่มบุคคล แทนจำนวนนักเรียน','blue',`<circle cx="27" cy="23" r="7" fill="white"/><path d="M13 49v-6a10 10 0 0 1 10-10h8a10 10 0 0 1 10 10v6" fill="white"/><path d="M40 17a7 7 0 0 1 0 13M45 35a9 9 0 0 1 7 9v5"/><path d="M20 49v-6M34 49v-6"/>`],
 ['completed','เรียนจบแล้ว','วงกลมพร้อมเครื่องหมายถูก ใช้ซ้ำกับผู้เรียนที่เรียนจบ','green',`<circle cx="32" cy="32" r="20" fill="white"/><path d="m22 32 7 7 14-15" stroke-width="3.4"/>`],
 ['learner-status','สถานะผู้เรียนทั้งหมด','บุคคลพร้อมรายการสถานะ','teal',`<circle cx="23" cy="23" r="7" fill="white"/><path d="M11 49v-7a9 9 0 0 1 9-9h6a9 9 0 0 1 9 9v7" fill="white"/><path d="m39 20 3 3 5-6M40 33h11M40 44h11"/><circle cx="43" cy="33" r="2" fill="ACCENT" stroke="none"/>`],
 ['in-progress','กำลังเรียน','หนังสือพร้อมปุ่มเล่น แทนกิจกรรมการเรียนที่ดำเนินอยู่','blue',`<path d="M30 21c-5-4-11-5-18-3v27c7-2 13-1 18 3 5-4 11-5 18-3V18c-7-2-13-1-18 3Z" fill="white"/><path d="M30 21v27M18 26l6 1M18 33l6 1"/><circle cx="46" cy="44" r="10" fill="#EAF5FF"/><path d="m44 40 6 4-6 4Z" fill="ACCENT"/>`],
 ['not-started','ยังไม่เริ่มเรียน','หนังสือปิด แทนบทเรียนที่ยังไม่ได้เปิด','slate',`<path d="M20 13h26v38H20a6 6 0 0 1-6-6V19a6 6 0 0 1 6-6Z" fill="white"/><path d="M20 13v27M20 40h26M14 45a5 5 0 0 1 6-5M21 46h19"/><path d="M33 14v15l4-3 4 3V14" fill="ACCENT"/>`],
 ['teaching-overview','ภาพรวมการสอน','กราฟแท่งบนแผงรายงาน แทนภาพรวมข้อมูล','teal',`<rect x="12" y="13" width="40" height="38" rx="5" fill="white"/><path d="M19 43h26M21 36v7M31 28v15M41 21v22"/><path d="M19 20h9" stroke="ACCENT"/>`],
 ['calendar','วันที่','ปฏิทิน แทนวันที่ปัจจุบัน','teal',`<rect x="13" y="16" width="38" height="35" rx="5" fill="white"/><path d="M13 26h38M23 12v9M41 12v9"/><rect x="21" y="33" width="7" height="7" rx="2" fill="ACCENT" stroke="none"/><path d="M36 36h6M22 45h5M36 45h6"/>`],
 ['last-updated','อัปเดตล่าสุด','นาฬิกาและลูกศรหมุน แทนเวลาที่อัปเดต','teal',`<path d="M49 25a19 19 0 1 0 1 12"/><path d="M49 15v10H39"/><path d="M32 21v12l8 5"/><circle cx="32" cy="33" r="2" fill="ACCENT" stroke="none"/>`]
];
const items=[];
// Keep a generous clear area and only the details needed to identify each category.
const cleanShapes = {
 courses: `<path d="M32 20c-6-4-12-5-20-3v29c8-2 14-1 20 3 6-4 12-5 20-3V17c-8-2-14-1-20 3Z" fill="white"/><path d="M32 20v29"/>`,
 classrooms: `<rect x="13" y="15" width="38" height="28" rx="4" fill="white"/><path d="M22 24h20M22 32h12M32 43v8M24 51h16"/>`,
 students: `<circle cx="26" cy="23" r="7" fill="white"/><path d="M13 49v-6a10 10 0 0 1 10-10h6a10 10 0 0 1 10 10v6"/><path d="M41 17a7 7 0 0 1 0 13M46 35a9 9 0 0 1 6 9v5"/>`,
 completed: `<circle cx="32" cy="32" r="19" fill="white"/><path d="m23 32 6 6 13-13" stroke-width="3.5"/>`,
 'learner-status': `<circle cx="24" cy="23" r="7" fill="white"/><path d="M12 49v-6a10 10 0 0 1 10-10h4a10 10 0 0 1 10 10v6"/><path d="M43 22h8M43 33h8M43 44h8"/>`,
 'in-progress': `<path d="M46 18a19 19 0 1 0 5 18"/><path d="m28 24 11 8-11 8Z" fill="ACCENT"/>`,
 'not-started': `<path d="M21 14h25v36H21a6 6 0 0 1-6-6V20a6 6 0 0 1 6-6Z" fill="white"/><path d="M15 44a6 6 0 0 1 6-6h25M25 23h12"/>`,
 'teaching-overview': `<path d="M15 15v35h36M24 39V29M35 39V19M46 39V25"/>`,
 calendar: `<rect x="14" y="17" width="36" height="33" rx="4" fill="white"/><path d="M14 27h36M23 13v8M41 13v8"/><rect x="24" y="34" width="8" height="8" rx="2" fill="ACCENT" stroke="none"/>`,
 'last-updated': `<path d="M49 24a19 19 0 1 0 1 13M49 14v10H39M32 22v11l8 5"/>`
};
for(const [id,label,meaning,palette,shape] of defs){
 const [bg,border,ink,accent]=palettes[palette];
 const body=(cleanShapes[id] || shape).replaceAll('ACCENT',accent);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" role="img" aria-label="${label}"><rect x="1" y="1" width="62" height="62" rx="17" fill="${bg}" stroke="${border}" stroke-width="1.2"/><g stroke="${ink}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
 writeFileSync(dir+id+'.svg',svg);
 const descriptions={courses:'หนังสือเปิดเล่มเดียว แทนรายวิชาที่เปิดสอน', classrooms:'กระดานห้องเรียน', 'in-progress':'วงความคืบหน้าพร้อมสัญลักษณ์ดำเนินต่อ', 'teaching-overview':'กราฟสรุปภาพรวม'};
 items.push({id,label,meaning:descriptions[id] || meaning,svg});
}
const cards=items.map(({id,label,meaning,svg})=>`<article><div class="large">${svg}</div><h2>${label}</h2><code>${id}.svg</code><p>${meaning}</p><div class="sizes">${[24,32,40,64].map(size=>`<div><span style="width:${size}px;height:${size}px">${svg}</span><small>${size}</small></div>`).join('')}</div><a href="${id}.svg" download>ดาวน์โหลด SVG ↓</a></article>`).join('');
const old=['bookroll','video','quiz','adaptive-quiz'].map(id=>`<div>${readFileSync(dir+id+'.svg','utf8')}<span>${id}</span></div>`).join('');
writeFileSync(dir+'dashboard-icons.html',`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dashboard category icons</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f8fa;color:#17353b;font-family:Tahoma,system-ui,sans-serif;line-height:1.6}main{max-width:1200px;margin:auto;padding:45px 28px}header{margin-bottom:30px}header small{color:#237f77;letter-spacing:2px}h1{font-size:30px;margin:10px 0}header p{color:#607287}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}article{background:#fff;border:1px solid #dfe7ee;border-radius:24px;padding:28px}.large{padding:10px 0 17px}.large svg{width:96px;height:96px}h2{font-size:19px;margin:8px 0}code{font-size:12px;color:#63758a}article p{font-size:12px;color:#627687;min-height:40px}.sizes{display:flex;align-items:flex-end;gap:20px;padding-top:20px;border-top:1px solid #e8edf2;margin-top:20px}.sizes div{display:flex;flex-direction:column;align-items:center;gap:8px}.sizes span{display:block}.sizes svg{width:100%;height:100%}.sizes small{font-size:10px;color:#748493}a{display:inline-block;color:#237f77;font-size:12px;margin-top:20px;padding:10px 0}a:focus-visible{outline:3px solid #2675ac}.originals{display:flex;gap:35px;flex-wrap:wrap;background:white;border:1px solid #dfe7ee;border-radius:20px;padding:24px;margin:20px 0 30px}.originals div{display:flex;align-items:center;gap:12px;font-size:12px}.originals svg{width:40px;height:40px}.note{font-size:13px;color:#627687;margin:25px 0}@media(max-width:1000px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.grid{grid-template-columns:1fr}main{padding:28px 18px}h1{font-size:25px}}</style><main><header><small>LEARNING TOOLS / EXTENDED ICON SET</small><h1>ไอคอนหมวดหมู่แดชบอร์ด</h1><p>10 ไอคอนใหม่ · รูปทรง เส้น และสีเข้าชุดกับเครื่องมือเรียนรู้เดิม</p></header><div class="originals">${old}</div><section class="grid">${cards}</section><p class="note">ใช้ completed.svg ทั้ง “ผู้เรียนที่เรียนจบ” และ “เรียนจบแล้ว” เพื่อให้สถานะเดียวกันใช้สัญลักษณ์เดียวกัน · ไอคอนมีชื่อสำหรับโปรแกรมอ่านหน้าจอ หากมีข้อความกำกับอยู่แล้วให้ตั้ง aria-hidden="true" บน SVG เพื่อลดการอ่านซ้ำ</p></main></html>`);
writeFileSync(dir+'dashboard-icons.json',JSON.stringify(items.map(({id,label,meaning})=>({file:id+'.svg',label,meaning})),null,2));
console.log(`Created ${items.length} SVG icons, preview, and label mapping.`);
