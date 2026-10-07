const safe=value=>String(value||'victory-badge').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'');

export async function downloadBadge(element,badge,format='png'){
  if(!element)throw new Error('Badge preview is not ready');
  const {toPng}=await import('html-to-image');
  const dataUrl=await toPng(element,{pixelRatio:3,cacheBust:true,backgroundColor:'#062f50'});
  const filename=`CUST-${safe(badge.batchNumber)}-${safe(badge.sportName)}-${safe(badge.winningTeam)}`;
  if(format==='pdf'){
    const {jsPDF}=await import('jspdf');
    const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});const pageWidth=pdf.internal.pageSize.getWidth();const pageHeight=pdf.internal.pageSize.getHeight();const margin=18;const ratio=element.offsetHeight/element.offsetWidth;let width=pageWidth-margin*2;let height=width*ratio;if(height>pageHeight-margin*2){height=pageHeight-margin*2;width=height/ratio}pdf.setFillColor(244,247,250);pdf.rect(0,0,pageWidth,pageHeight,'F');pdf.addImage(dataUrl,'PNG',(pageWidth-width)/2,(pageHeight-height)/2,width,height);pdf.save(`${filename}.pdf`);return;
  }
  const link=document.createElement('a');link.download=`${filename}.png`;link.href=dataUrl;link.click();
}
