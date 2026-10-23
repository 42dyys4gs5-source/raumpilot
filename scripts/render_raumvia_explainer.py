"""Render Raumvia's silent explainer with clearly labelled fictional examples.
Requires Python/Pillow, DejaVu Sans fonts and ffmpeg. Run from any directory.
"""
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/media'
W, H, FPS, DURATION = 1280, 720, 24, 48
GREEN = '#14594d'; DARK = '#14342e'; PAPER = '#f7f5ef'; GOLD = '#bf9450'; MUTED = '#586a62'; LINE = '#dce3dc'; PALE = '#e8f0e9'
FONT_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans'
def font(n, bold=False): return ImageFont.truetype(FONT_PATH + ('-Bold' if bold else '') + '.ttf', n)
FONTS = {(n,b):font(n,b) for n in [18,20,22,24,26,28,30,34,38,42,46,52,58] for b in [False,True]}
def text(d,x,y,s,n=26,c=DARK,b=False): d.text((x,y),s,font=FONTS[n,b],fill=c)
def lines(d,x,y,ss,n=26,c=MUTED,gap=40,b=False):
 for i,s in enumerate(ss): text(d,x,y+i*gap,s,n,c,b)
def box(d,xy,fill='white',radius=20,outline=None): d.rounded_rectangle(xy,radius=radius,fill=fill,outline=outline,width=2)
def check(d,x,y,c=GREEN): d.line([(x,y+10),(x+8,y+18),(x+26,y)],fill=c,width=5)
def chrome(k):
 im=Image.new('RGB',(W,H),PAPER);d=ImageDraw.Draw(im)
 box(d,(56,34,104,82),GREEN,13);text(d,66,39,'R',30,'white',True);d.ellipse((91,67,97,73),fill=GOLD)
 text(d,118,40,'Raumvia',30,DARK,True);text(d,839,49,'RAUMVERMIETUNG. EINFACH.',18,MUTED)
 d.line((56,108,1224,108),fill=LINE,width=2)
 for i in range(6):box(d,(56+i*197,671,228+i*197,676),GREEN if i<=k else LINE,2)
 return im,d
def heading(d,step,title):
 text(d,56,141,step,20,GREEN,True);text(d,56,185,title,42,DARK,True)
def sample(d,x=931,y=285):text(d,x,y,'BEISPIELDATEN',18,MUTED)
def frame(t):
 k=min(int(t//8),5);u=t-k*8;im,d=chrome(k)
 if k==0:
  text(d,56,151,'FÜR RAUMVERMIETER IN DER SCHWEIZ',20,GREEN,True)
  lines(d,56,209,['Ihr Raum.','Einfach online buchbar.'],46,DARK,65,True)
  lines(d,56,384,['Freie Zeiten zeigen. Buchungen verwalten.','Weniger Rückfragen im Alltag.'],26,gap=43)
  box(d,(56,525,657,590),GREEN,16);text(d,81,544,'Buchungsseite · Kalender · Übersicht',24,'white',True)
  box(d,(816,164,1224,602),GREEN,28)
  for i,(a,b) in enumerate([('01','Raum erfassen'),('02','Link teilen'),('03','Buchungen erhalten')]):
   y=204+i*121;box(d,(846,y,900,y+49),'#2c6c60',12);text(d,855,y+9,a,22,'white',True)
   text(d,847,y+60,b,24,'white',True)
 elif k==1:
  heading(d,'01 / AUS SICHT DER MIETENDEN','Einen passenden Termin wählen')
  box(d,(56,271,1224,607),'white',22,LINE)
  text(d,86,292,'Raum am Park',30,DARK,True);sample(d,953,299)
  text(d,86,353,'Beispiel: 28. Oktober',24,MUTED)
  for i,label in enumerate(['26','27','28','29','30']):
   x=86+i*106;selected=i==2 and u>.6
   box(d,(x,404,x+82,481),GREEN if selected else PALE,12)
   text(d,x+23,424,label,26,'white' if selected else DARK,True)
  text(d,737,356,'Dauer',22,MUTED);box(d,(737,397,1188,470),PALE,12);text(d,763,416,'2 Stunden',28,DARK,True)
  text(d,737,499,'Startzeit',22,MUTED)
  for i,label in enumerate(['10:00','14:00','18:00']):
   x=737+i*154;box(d,(x,537,x+139,584),GREEN if i==1 and u>1.3 else PAPER,10)
   text(d,x+23,547,label,22,'white' if i==1 and u>1.3 else DARK,True)
  text(d,86,533,'Freie Zeiten sehen. Dauer festlegen.',24,GREEN,True)
 elif k==2:
  heading(d,'02 / PREIS UND BUCHUNG','Alles vor dem Abschluss sehen')
  box(d,(56,273,742,606),'white',22,LINE);sample(d,500,293)
  for i,(label,price) in enumerate([('2 Stunden Raummiete','CHF 120'),('Beamer als Zusatzleistung','CHF 20'),('Gesamtpreis','CHF 140')]):
   y=345+i*74
   if i==2:d.line((86,y-15,711,y-15),fill=LINE,width=2)
   if u>i*.45:text(d,86,y,label,24,DARK,i==2);text(d,570,y,price,24,GREEN,i==2)
  box(d,(776,273,1224,606),GREEN,22)
  text(d,807,307,'Sie entscheiden:',26,'white',True)
  lines(d,807,367,['Sofortbuchung','oder Anfrage','mit Ihrer Freigabe.'],28,'white',48,True)
  lines(d,807,540,['Je Raum einstellbar.'],22,'#e2eee8')
 elif k==3:
  heading(d,'03 / AUS SICHT DER VERMIETENDEN','Buchungen an einem Ort')
  box(d,(56,273,1224,605),'white',22,LINE);text(d,86,294,'Ihre Buchungsübersicht',28,DARK,True);sample(d,950,299)
  rows=[('Mi, 28. Okt.','14:00–16:00','Bestätigt'),('Do, 29. Okt.','10:00–12:00','Anfrage'),('Fr, 30. Okt.','18:00–22:00','Bestätigt')]
  for i,(day,time,status) in enumerate(rows):
   if u>i*.45:
    y=360+i*69;box(d,(86,y,1194,y+54),PAPER,10);text(d,106,y+12,day,22,DARK,True);text(d,460,y+12,time,22,MUTED)
    box(d,(965,y+7,1177,y+47),PALE if status=='Bestätigt' else '#f2e8d6',12);text(d,985,y+14,status,20,GREEN if status=='Bestätigt' else '#805d28',True)
  text(d,86,576,'Bestätigungen per E-Mail · Kalender im Blick',20,GREEN,True)
 elif k==4:
  heading(d,'04 / MIT IHRER KUNDSCHAFT TEILEN','Ein Link. Viele Möglichkeiten.')
  box(d,(56,273,615,606),GREEN,22);text(d,86,307,'Ihre Buchungsseite',30,'white',True)
  lines(d,86,382,['Auf Ihrer Website','In E-Mails und Social Media','Als QR-Code vor Ort'],24,'#e2eee8',49)
  box(d,(86,549,584,585),'#2c6c60',10);text(d,104,555,'Link teilen oder Widget einbetten',20,'white')
  box(d,(645,273,1224,606),'white',22,LINE);text(d,675,307,'Zahlung passend zu Ihnen',26,DARK,True)
  lines(d,675,371,['Optional online über Ihr','eigenes Stripe-Konto.','Oder per Rechnung / vor Ort.'],24,MUTED,43)
  lines(d,675,526,['Karte und, je nach Konto, TWINT.','Stripe-Gebühren können anfallen.'],20,MUTED,30)
 else:
  text(d,56,154,'RAUMVIA KENNENLERNEN',20,GREEN,True)
  lines(d,56,211,['Erst ausprobieren.','Dann den eigenen','Raum einrichten.'],46,DARK,64,True)
  box(d,(56,454,685,537),GREEN,16);text(d,87,474,'raumvia.ch/demo',38,'white',True)
  text(d,56,567,'Demo ohne Anmeldung. Keine echte Buchung.',24,MUTED)
  box(d,(824,197,1224,602),PALE,28)
  for i,label in enumerate(['Termin wählen','Preis verstehen','Übersicht ansehen']):
   y=262+i*109;check(d,855,y+4);text(d,900,y,label,24,GREEN,True)
 # Quiet slide fade and progress indicator, no flashing or autoplay assumption.
 d.rectangle((0,H-4,int(W*t/DURATION),H),fill=GOLD)
 fade=min(1,u/.3,(8-u)/.3)
 if fade<1:im=Image.blend(Image.new('RGB',(W,H),PAPER),im,max(0,fade))
 return im

CAPTIONS=[
 'Raumvia: Raumvermietung einfach online organisieren. Freie Zeiten zeigen, Buchungen verwalten und Rückfragen reduzieren.',
 'Beispiel Raum am Park: Mietende wählen Datum, Dauer und eine freie Startzeit. Alle dargestellten Daten sind fiktiv.',
 'Beispielpreis: zwei Stunden CHF 120 und Beamer CHF 20 ergeben CHF 140. Vermietende wählen Sofortbuchung oder Anfrage mit Freigabe.',
 'Vermietende behalten Buchungen und Anfragen im Kalender und in der Übersicht im Blick. Bestätigungen werden per E-Mail verschickt.',
 'Die Buchungsseite lässt sich per Link, QR-Code oder Website-Widget teilen. Onlinezahlung ist optional über das eigene Stripe-Konto möglich. TWINT hängt vom Konto ab; Stripe-Gebühren können anfallen. Alternativ: Rechnung oder Zahlung vor Ort.',
 'Probieren Sie die Demo auf raumvia.ch/demo aus. Ohne Anmeldung und ohne echte Buchung. Danach können Sie Ihren eigenen Raum einrichten.'
]
if __name__=='__main__':
 OUT.mkdir(parents=True,exist_ok=True)
 frame(2).save(OUT/'raumvia-erklaervideo-poster.jpg',quality=90)
 proc=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'raumvia-erklaervideo.mp4')],stdin=subprocess.PIPE)
 for i in range(DURATION*FPS):proc.stdin.write(frame(i/FPS).tobytes())
 proc.stdin.close();assert proc.wait()==0
 vtt='WEBVTT\n\n'
 for i,c in enumerate(CAPTIONS):vtt+=f'{i+1}\n00:00:{i*8:02d}.000 --> 00:00:{(i+1)*8:02d}.000\n{c}\n\n'
 (OUT/'raumvia-erklaervideo.vtt').write_text(vtt)
 contact=Image.new('RGB',(1280,1080),PAPER)
 for i,t in enumerate([2,11,19,27,35,43]):contact.paste(frame(t).resize((640,360)),((i%2)*640,(i//2)*360))
 contact.save('/tmp/raumvia-video-contactsheet.jpg',quality=90)
 print('Rendered 48-second silent explainer, poster, captions.')
