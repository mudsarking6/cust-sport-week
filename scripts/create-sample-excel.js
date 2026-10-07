import XLSX from 'xlsx';

const rows = [
  {'Student Name':'Ahmed Raza','Registration Number':'FA23-BSE-101','Department':'Faculty of Computing','Semester':'6','Section':'A','Contact Number':'0300-1234567','Game Name':'Cricket','Position':'Batsman'},
  {'Student Name':'Hamza Ali','Registration Number':'FA23-BSE-114','Department':'Faculty of Computing','Semester':'6','Section':'A','Contact Number':'0301-2345678','Game Name':'Cricket','Position':'Fast bowler'},
  {'Student Name':'Usman Khan','Registration Number':'SP24-BCS-087','Department':'Faculty of Computing','Semester':'4','Section':'B','Contact Number':'0302-3456789','Game Name':'Cricket','Position':'Wicket keeper'},
  {'Student Name':'Saad Hassan','Registration Number':'FA22-BBA-042','Department':'Management Sciences','Semester':'8','Section':'A','Contact Number':'0303-4567890','Game Name':'Cricket','Position':'All-rounder'},
  {'Student Name':'Bilal Ahmed','Registration Number':'SP23-BEE-066','Department':'Engineering','Semester':'5','Section':'C','Contact Number':'0304-5678901','Game Name':'Cricket','Position':'Spin bowler'},
  {'Student Name':'Adeel Shah','Registration Number':'FA24-BSE-129','Department':'Faculty of Computing','Semester':'3','Section':'B','Contact Number':'0305-6789012','Game Name':'Cricket','Position':'Batsman'},
  {'Student Name':'Muneeb Tariq','Registration Number':'SP22-BME-031','Department':'Engineering','Semester':'8','Section':'A','Contact Number':'0306-7890123','Game Name':'Cricket','Position':'Reserve player'},
  {'Student Name':'Zain Abbas','Registration Number':'FA23-BBA-095','Department':'Management Sciences','Semester':'6','Section':'C','Contact Number':'0307-8901234','Game Name':'Cricket','Position':'Team captain'}
];

const workbook = XLSX.utils.book_new();
const records = XLSX.utils.json_to_sheet(rows);
records['!cols'] = [{wch:22},{wch:24},{wch:25},{wch:12},{wch:10},{wch:18},{wch:16},{wch:20}];
records['!autofilter'] = {ref:'A1:H9'};
XLSX.utils.book_append_sheet(workbook, records, 'Player Records');

const instructions = XLSX.utils.aoa_to_sheet([
  ['CUST Sports Week — Excel Import Template'],
  ['Use the Player Records sheet for importing players.'],
  ['Do not rename the required column headers.'],
  ['Student Name and Registration Number are mandatory.'],
  ['The selected game in the web application determines the imported sheet game.']
]);
instructions['!cols'] = [{wch:78}];
XLSX.utils.book_append_sheet(workbook, instructions, 'Instructions');

XLSX.writeFile(workbook, 'CUST-Player-Import-Sample.xlsx');
console.log('Created CUST-Player-Import-Sample.xlsx');
