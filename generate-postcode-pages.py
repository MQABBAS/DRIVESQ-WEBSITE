#!/usr/bin/env python3
"""
Generate unique, high-quality postcode & town pages for ALL Manchester & Stockport areas.
Template matches homepage dark theme (Oswald/Inter fonts, DriveSQ brand colors).
Each page is 100% unique with educational content, images, videos, WhatsApp button.
"""
import os, json, hashlib, random, html as html_mod, re
os.chdir('/home/user/DRIVESQ-WEBSITE')

# ============================================================
# ASSETS
# ============================================================
LOGO = 'https://i.postimg.cc/sx8zRRKV/cropped-circle-image.png'
IMGS = {
    'pass': 'https://i.postimg.cc/pLtNygxL/DRIVE-SQ-PASS.jpg',
    'student': 'https://i.postimg.cc/9QVWs44z/pic10000.jpg',
    'instructor': 'https://i.postimg.cc/ht8kmpPN/pic15.jpg',
    'car': 'https://i.postimg.cc/5tBLmH25/drivesq1.jpg',
    'learner': 'https://i.postimg.cc/157krfpW/istockphoto-1462539852-612x612.jpg',
    'mock': 'https://i.postimg.cc/PqvTw19J/mock.jpg',
    'pass2': 'https://i.postimg.cc/4dhkYZKF/PASS.jpg',
}
VIDEO = 'video9.mp4'
WA = 'https://wa.me/447352932003'

# ============================================================
# EVERY MANCHESTER & STOCKPORT POSTCODE + TOWNS/VILLAGES
# Each entry has genuinely unique local data
# ============================================================
POSTCODES = [
    # Manchester M postcodes
    {'pc':'M1','area':'Manchester City Centre','towns':['Piccadilly','Deansgate','Chinatown','Gay Village','Northern Quarter'],'tc':'Cheetham Hill','roads':['Portland Street','Piccadilly','Deansgate','Oxford Street','Whitworth Street'],'landmarks':['Piccadilly Gardens','Manchester Central Library','the Arndale Centre','St Peter\'s Square'],'challenges':['one-way systems around Piccadilly','bus-only lanes on Portland Street','tram crossings at St Peter\'s Square','heavy pedestrian traffic on Market Street'],'tip':'The one-way loop around Piccadilly catches everyone — learn the correct lane sequence before attempting it.','nearby':['M2','M3','M4']},
    {'pc':'M2','area':'Manchester City Centre (Deansgate)','towns':['Deansgate','Spinningfields','St Ann\'s Square','King Street'],'tc':'Cheetham Hill','roads':['Deansgate','Peter Street','Bridge Street','Quay Street','John Dalton Street'],'landmarks':['Spinningfields business district','the Opera House','St Ann\'s Church','John Rylands Library'],'challenges':['Deansgate traffic lights sequence','taxi ranks blocking lanes','pedestrian crossings every 50 metres','loading bays reducing road width'],'tip':'Deansgate has 11 sets of traffic lights in 1 mile — practise reading them ahead to maintain smooth progress.','nearby':['M1','M3','M15']},
    {'pc':'M3','area':'Salford (Blackfriars/Greengate)','towns':['Blackfriars','Greengate','Trinity','New Bailey'],'tc':'Cheetham Hill','roads':['Chapel Street','Trinity Way','Blackfriars Road','New Bailey Street','the A6'],'landmarks':['Salford Cathedral','New Bailey development','Trinity retail park'],'challenges':['Chapel Street bus lanes','Trinity Way multi-lane roundabout','Greengate slip road merges','construction traffic from new developments'],'tip':'Trinity Way roundabout has 3 lanes — read the overhead signs before you commit to a lane.','nearby':['M1','M2','M5']},
    {'pc':'M4','area':'Ancoats & Northern Quarter','towns':['Ancoats','Northern Quarter','New Cross','Miles Platting edge'],'tc':'Cheetham Hill','roads':['Great Ancoats Street','Oldham Road','Swan Street','Rochdale Road','Lever Street'],'landmarks':['Cutting Room Square','New Islington Marina','Band on the Wall','Craft & Design Centre'],'challenges':['Great Ancoats Street 4-lane width changes','tram tracks on Oldham Road','new-build construction traffic','loading vans on Lever Street'],'tip':'Great Ancoats Street widens from 2 to 4 lanes mid-road — know your lane before you reach the widening point.','nearby':['M1','M11','M40']},
    {'pc':'M5','area':'Salford (Ordsall/Salford Quays edge)','towns':['Ordsall','Salford Crescent','Adelphi','Pendleton edge'],'tc':'Eccles','roads':['Regent Road','Ordsall Lane','Oldfield Road','Liverpool Street','the A57(M)'],'landmarks':['University of Salford','Salford Crescent station','Peel Park'],'challenges':['A57(M) urban motorway merge','Regent Road dual carriageway','Ordsall Lane traffic calming','Pendleton roundabout'],'tip':'The A57(M) is technically a motorway — you must match traffic speed on the slip road before merging.','nearby':['M3','M6','M50']},
    {'pc':'M6','area':'Salford (Pendleton/Irlams o\' th\' Height)','towns':['Pendleton','Irlams o\' th\' Height','Seedley','Langworthy'],'tc':'Eccles','roads':['Bolton Road','Eccles New Road','Langworthy Road','Belvedere Road','Broad Street'],'landmarks':['Pendleton Gateway','Salford Shopping City','Buile Hill Park'],'challenges':['Bolton Road A6 heavy traffic','Eccles New Road bus lanes','Pendleton roundabout complexity','residential speed bumps throughout Seedley'],'tip':'Buile Hill Park has quiet residential streets perfect for early-stage junction practice.','nearby':['M5','M7','M27']},
    {'pc':'M7','area':'Salford (Higher Broughton/Cheetwood)','towns':['Higher Broughton','Lower Broughton','Cheetwood','Kersal'],'tc':'Cheetham Hill','roads':['Bury New Road','Great Cheetham Street','Leicester Road','Camp Street','Broughton Road'],'landmarks':['Kersal Moor','the Cliff (Manchester United training ground)','Broughton Park'],'challenges':['Bury New Road speed and volume','narrow terraced streets in Lower Broughton','Kersal roundabout','pedestrians near local shops'],'tip':'Bury New Road is a 40mph dual carriageway here — speed cameras are active.','nearby':['M8','M25','M6']},
    {'pc':'M8','area':'Crumpsall & Cheetham Hill','towns':['Crumpsall','Cheetham Hill','Cheetwood','Strangeways'],'tc':'Cheetham Hill','roads':['Cheetham Hill Road','Bury Old Road','Queens Road','Crumpsall Lane','Waterloo Road'],'landmarks':['North Manchester General Hospital','Queens Park','Cheetham Hill Road shops','HMP Manchester (Strangeways)'],'challenges':['Cheetham Hill Road double parking','hospital traffic at all hours','Queens Road multi-lane junction','pedestrian jaywalking on shopping streets'],'tip':'This IS your test centre postcode — you will drive these exact roads on test day. Know every junction.','nearby':['M7','M9','M25']},
    {'pc':'M9','area':'Blackley & Harpurhey','towns':['Blackley','Harpurhey','Moston','Charlestown'],'tc':'Cheetham Hill','roads':['Rochdale Road','Moston Lane','Victoria Avenue','Oldham Road','Chain Bar'],'landmarks':['Boggart Hole Clough park','North City Family & Fitness Centre','Plant Hill Park'],'challenges':['Rochdale Road A664 speed transitions','Chain Bar roundabout','school traffic on Moston Lane','residential parking on Victoria Avenue'],'tip':'Boggart Hole Clough car park is great for practising bay parking in a safe, quiet environment.','nearby':['M8','M10','M40']},
    {'pc':'M10','area':'Newton Heath (partial)','towns':['Newton Heath','North Manchester industrial'],'tc':'Failsworth','roads':['Oldham Road','Briscoe Lane','Culcheth Lane','Dean Lane'],'landmarks':['Newton Heath retail parks','Ten Acres industrial area'],'challenges':['Oldham Road HGV traffic','industrial estate access roads','railway bridges with height restrictions'],'tip':'The retail parks off Oldham Road have large car parks ideal for manoeuvre practice outside peak hours.','nearby':['M4','M9','M40']},
    {'pc':'M11','area':'Openshaw & Clayton','towns':['Openshaw','Clayton','Beswick','Bradford'],'tc':'Failsworth','roads':['Ashton Old Road (A635)','Alan Turing Way','Pottery Lane','Ashton New Road','Clayton Lane'],'landmarks':['Etihad Campus','National Cycling Centre','Openshaw Park','East Manchester Academy'],'challenges':['Etihad matchday traffic and road closures','Alan Turing Way 50mph dual carriageway','Ashton Old Road bus lanes with cameras','industrial traffic on Clayton Lane'],'tip':'Book lessons on non-matchdays. On match weekdays, Alan Turing Way is gridlocked from 5pm.','nearby':['M12','M18','M34']},
    {'pc':'M12','area':'Ardwick & Brunswick','towns':['Ardwick','Brunswick','West Gorton edge'],'tc':'Cheetham Hill','roads':['Hyde Road (A57)','Stockport Road','Devonshire Street','Ardwick Green','Pin Mill Brow'],'landmarks':['the Apollo theatre','Ardwick Green park','Brunswick estate','Pin Mill Brow junction'],'challenges':['Mancunian Way on/off ramps at speed','Pin Mill Brow 5-exit roundabout','Apollo event-night congestion','Hyde Road speed transitions 40→30'],'tip':'Pin Mill Brow roundabout has 5 exits — learn each one. Examiners from Cheetham Hill use this frequently.','nearby':['M1','M13','M18']},
    {'pc':'M13','area':'Longsight & Victoria Park','towns':['Longsight','Victoria Park','Ardwick edge'],'tc':'Cheetham Hill','roads':['Stockport Road (A6)','Slade Lane','Plymouth Grove','Anson Road','Upper Brook Street'],'landmarks':['Longsight Market','Crowcroft Park','Manchester Royal Infirmary (nearby)','Victoria Park mansions'],'challenges':['Stockport Road A6 heavy traffic','market-day congestion Tuesdays/Saturdays','Slade Lane junction complexity','Upper Brook Street fast-moving traffic'],'tip':'Stockport Road / Slade Lane junction requires you to be in lane early — traffic moves fast here.','nearby':['M12','M14','M19']},
    {'pc':'M14','area':'Rusholme, Fallowfield & Moss Side','towns':['Rusholme','Fallowfield','Moss Side','Victoria Park'],'tc':'West Didsbury','roads':['Wilmslow Road (Curry Mile)','Moseley Road','Platt Lane','Dickenson Road','Princess Road'],'landmarks':['the Curry Mile restaurants','Platt Fields Park','Manchester Academy','Alexandra Park'],'challenges':['Curry Mile double parking and pedestrians','Wilmslow Road bus-lane cameras (£70 fine)','student pedestrians in Fallowfield','Princess Road speed camera transitions'],'tip':'Wilmslow Road bus lanes operate 7:30-9:30 and 16:00-18:30. Drive in them outside those hours = fine.','nearby':['M13','M15','M20']},
    {'pc':'M15','area':'Hulme & Castlefield','towns':['Hulme','Castlefield','Brooklands (inner)','Knott Mill'],'tc':'Cheetham Hill','roads':['Princess Road','Stretford Road','Chester Road','Mancunian Way','City Road South'],'landmarks':['Hulme Arch bridge','Castlefield basin','HOME theatre','Deansgate Locks'],'challenges':['Princess Road dual carriageway speed changes','Mancunian Way junction complexity','Castlefield cobbled streets','Chester Road / Stretford Road split junction'],'tip':'Princess Road changes from dual carriageway to single — fixed speed cameras catch people not slowing in time.','nearby':['M1','M14','M16']},
    {'pc':'M16','area':'Old Trafford & Whalley Range','towns':['Old Trafford','Whalley Range','Firswood','Brooks Bar'],'tc':'Sale','roads':['Chester Road','Talbot Road','Wilbraham Road','Upper Chorlton Road','Seymour Grove'],'landmarks':['Old Trafford football stadium','Lancashire Cricket Club','Manley Park','Trafford Bar tram stop'],'challenges':['matchday traffic and road closures','Chester Road tram crossings','Wilbraham Road 20mph school zones','narrow residential streets with parked cars'],'tip':'Check the Man Utd fixture list before booking lessons. Chester Road is unusable 2 hours before kick-off.','nearby':['M15','M21','M32']},
    {'pc':'M17','area':'Trafford Park (industrial)','towns':['Trafford Park','Trafford Park Village'],'tc':'Sale','roads':['Trafford Park Road','Village Way','Ashburton Road','Mosley Road','Third Avenue'],'landmarks':['Trafford Centre','Imperial War Museum North','EventCity','Trafford Park industrial estate'],'challenges':['multi-lane Trafford Centre roundabouts','HGV traffic throughout','complex approach roads with gantry signs','pedestrians crossing between retail parks'],'tip':'Read the overhead gantry signs 200m before each Trafford Centre roundabout — lane choice is committed early.','nearby':['M16','M32','M41']},
    {'pc':'M18','area':'Gorton & Abbey Hey','towns':['Gorton','Abbey Hey','West Gorton'],'tc':'Failsworth','roads':['Hyde Road (A57)','Gorton Lane','Mount Road','Abbey Hey Lane','Reddish Lane'],'landmarks':['Gorton Monastery','Debdale Park','Gorton reservoir','Wright Robinson College'],'challenges':['Hyde Road 40mph dual carriageway sections','industrial HGV traffic on Gorton Lane','tight residential terraces near the monastery','Debdale Park school traffic'],'tip':'Gorton Lane has multiple mini-roundabouts that appear on Failsworth test routes — practise each one.','nearby':['M11','M12','M19']},
    {'pc':'M19','area':'Levenshulme & Burnage','towns':['Levenshulme','Burnage','Heaton Chapel edge'],'tc':'West Didsbury','roads':['Stockport Road (A6)','Kingsway (A34)','Burnage Lane','Slade Lane','Mauldeth Road'],'landmarks':['Levenshulme Market','Burnage Garden Village','Cringle Park','Green End playing fields'],'challenges':['A6 heavy traffic and bus stops','Kingsway A34 dual carriageway merges','railway bridge width restriction on Stockport Road','school traffic near Burnage Academy'],'tip':'The A6 railway bridge narrows to one lane — approach at 15mph and give way to oncoming traffic decisively.','nearby':['M13','M14','M20']},
    {'pc':'M20','area':'Didsbury & Withington','towns':['Didsbury','West Didsbury','East Didsbury','Withington','Ladybarn'],'tc':'West Didsbury','roads':['Wilmslow Road','Palatine Road','Barlow Moor Road','Burton Road','School Lane'],'landmarks':['Didsbury Village','Fletcher Moss Park','West Didsbury tram stop','Christie Hospital'],'challenges':['village traffic calming in Didsbury','school traffic on multiple routes','Palatine Road / Barlow Moor Road roundabout','parked cars on Burton Road narrowing to single track'],'tip':'The Palatine Road roundabout features on nearly every West Didsbury test route. Practise until it is muscle memory.','nearby':['M14','M19','M21']},
    {'pc':'M21','area':'Chorlton-cum-Hardy','towns':['Chorlton','Chorlton Green','Barlow Moor'],'tc':'Sale','roads':['Barlow Moor Road','Manchester Road','Wilbraham Road','Beech Road','Hardy Lane'],'landmarks':['Chorlton Green','Beech Road café strip','Chorlton Water Park','Longford Park'],'challenges':['Chorlton roundabout (4 exits, heavy traffic)','Beech Road parking chaos','Wilbraham Road speed bumps','Manchester Road rush-hour queues'],'tip':'The Chorlton roundabout (Barlow Moor Rd / Manchester Rd) is the number-one fail spot for Sale test routes. Drill it.','nearby':['M16','M20','M32']},
    {'pc':'M22','area':'Wythenshawe (Benchill/Northenden)','towns':['Wythenshawe','Benchill','Northenden','Northern Moor','Sharston'],'tc':'Sale','roads':['Princess Parkway (A5103)','Simonsway','Brownley Road','Palatine Road','Altrincham Road'],'landmarks':['Wythenshawe Park','the Forum','Wythenshawe Hospital','Northenden Village'],'challenges':['Princess Parkway 50mph sections','Metrolink tram crossings','large roundabouts on Simonsway','hospital traffic near Wythenshawe'],'tip':'Simonsway has 4 roundabouts in 1 mile — plan your lane choices for each one before you set off.','nearby':['M20','M23','M33']},
    {'pc':'M23','area':'Wythenshawe (Baguley/Brooklands)','towns':['Baguley','Brooklands','Shadowmoss','Ringway'],'tc':'Sale','roads':['Altrincham Road','Floats Road','Southmoor Road','Wythenshawe Road','Ringway Road'],'landmarks':['Manchester Airport (nearby)','Baguley Hall','Brooklands tram stop','Baguley Park'],'challenges':['airport-related traffic on Ringway Road','ambulance routes near Wythenshawe Hospital','tram crossings at Brooklands','low-flying aircraft noise distraction'],'tip':'Airport traffic peaks at dawn and 16:00-19:00. Ringway Road can gridlock — avoid these times for lessons.','nearby':['M22','M33','WA15']},
    {'pc':'M24','area':'Middleton','towns':['Middleton','Alkrington','Langley','Rhodes'],'tc':'Cheetham Hill','roads':['Manchester New Road','Rochdale Road','Grimshaw Lane','Middleton Road','Hollin Lane'],'landmarks':['Middleton town centre','Alkrington Hall','Hopwood Hall College','Middleton Arena'],'challenges':['Manchester New Road A576 speed transitions','Middleton centre one-way system','Grimshaw Lane narrow residential sections','roundabouts on the link road to M60'],'tip':'The M60 junction 20 roundabout at Middleton is multi-lane and busy — approach with a clear lane plan.','nearby':['M9','M25','OL9']},
    {'pc':'M25','area':'Prestwich & Whitefield','towns':['Prestwich','Whitefield','Sedgley Park','Hilton Park'],'tc':'Cheetham Hill','roads':['Bury New Road (A56)','Bury Old Road','Sheepfoot Lane','Park Road','Scholes Lane'],'landmarks':['Heaton Park','Prestwich Village','the Longfield Centre','St Mary\'s Park'],'challenges':['Bury New Road A56 dual carriageway speed','Heaton Park perimeter roads with hidden exits','tram crossings near Prestwich stop','school traffic on Scholes Lane'],'tip':'Heaton Park perimeter roads have hidden side-road exits every 100m — maintain observation even on empty-looking stretches.','nearby':['M8','M26','M45']},
    {'pc':'M26','area':'Radcliffe','towns':['Radcliffe','Black Lane','Outwood'],'tc':'Bury','roads':['Bury Road','Stand Lane','Water Street','Blackburn Street','Pilkington Way'],'landmarks':['Radcliffe Tower','the Met tram stop','Outwood Country Park','Radcliffe Market'],'challenges':['Pilkington Way dual carriageway merges','Radcliffe centre one-way system','steep gradient on Bury Road','Metrolink tram crossings'],'tip':'The Pilkington Way / Bury Road junction has short merge lanes — build speed quickly on the slip road.','nearby':['M25','M45','BL8']},
    {'pc':'M27','area':'Swinton & Pendlebury','towns':['Swinton','Pendlebury','Clifton','Newtown'],'tc':'Eccles','roads':['Manchester Road','Chorley Road','Station Road','Partington Lane','Bolton Road'],'landmarks':['Swinton town centre','Clifton Country Park','Salford City Stadium area'],'challenges':['Manchester Road A6 congestion','Swinton centre parking obstacles','Chorley Road inclines','the A580 East Lancashire Road access roundabouts'],'tip':'The A580/A6 interchange has fast-moving traffic — confidence with multi-lane roundabouts is essential here.','nearby':['M6','M28','M30']},
    {'pc':'M28','area':'Worsley & Walkden','towns':['Worsley','Walkden','Little Hulton','Ellenbrook'],'tc':'Eccles','roads':['Manchester Road','East Lancashire Road (A580)','Walkden Road','Memorial Road','Newearth Road'],'landmarks':['Worsley Village','the Bridgewater Canal','Walkden town centre','RHS Garden Bridgewater'],'challenges':['A580 East Lancashire Road fast dual carriageway','Worsley Delph narrow village roads','Walkden centre congestion','roundabouts on the A575'],'tip':'Worsley Village roads are narrow with stone walls — practise careful steering and slow-speed control here.','nearby':['M27','M29','M38']},
    {'pc':'M29','area':'Tyldesley','towns':['Tyldesley','Astley','Mosley Common'],'tc':'Bolton','roads':['Manchester Road','Elliott Street','Astley Street','Sale Lane','Mort Lane'],'landmarks':['Tyldesley town centre','Astley Green Colliery Museum','the Bridgewater Canal towpath'],'challenges':['narrow town-centre streets','Sale Lane bends','canal bridge weight restrictions','school traffic'],'tip':'Elliott Street in Tyldesley centre has tight parking on both sides — practise your door-mirror observation.','nearby':['M28','M46','WN7']},
    {'pc':'M30','area':'Eccles','towns':['Eccles','Monton','Winton','Patricroft'],'tc':'Eccles','roads':['Liverpool Road','Regent Street','Monton Road','Church Street','Barton Road'],'landmarks':['Eccles town centre','the original Eccles cake shop','Monton village green','Patricroft station'],'challenges':['M602 motorway junction access','Liverpool Road A57 volume','Barton Bridge approach complexity','Monton Road residential speed bumps'],'tip':'The M602 is metres away — your instructor can teach motorway joining and exiting right from your local area.','nearby':['M5','M27','M41']},
    {'pc':'M31','area':'Partington & Carrington','towns':['Partington','Carrington'],'tc':'Sale','roads':['Manchester Road','Common Lane','Lock Lane','Flixton Road','Carrington Lane'],'landmarks':['Partington Shopping Centre','Carrington Moss','Trans Pennine Trail access'],'challenges':['single-road access to Partington','Carrington Lane narrow sections','industrial traffic from Carrington Business Park','limited roundabout practice locally'],'tip':'Partington has limited junctions — use lessons to drive to Sale and Urmston for varied junction practice.','nearby':['M33','M41','WA14']},
    {'pc':'M32','area':'Stretford','towns':['Stretford','Gorse Hill','Longford Park area'],'tc':'Sale','roads':['Chester Road (A56)','Edge Lane','King Street','Stretford Road','Barton Road'],'landmarks':['Old Trafford stadium','Stretford Mall','Longford Park','Lancashire Cricket Club'],'challenges':['Chester Road / Edge Lane interchange (complex merge)','matchday traffic and road closures','tram crossings on Chester Road','the A56 speed transitions'],'tip':'Edge Lane merges onto Chester Road at a tricky angle — use mirrors, signal early, and merge decisively.','nearby':['M16','M17','M21']},
    {'pc':'M33','area':'Sale','towns':['Sale','Sale Moor','Ashton upon Mersey','Brooklands'],'tc':'Sale','roads':['Washway Road (A56)','Northenden Road','Marsland Road','Brooklands Road','Cross Street'],'landmarks':['Sale Water Park','Waterside retail area','Sale Metrolink stop','Worthington Park'],'challenges':['Washway Road A56 rush-hour queues','Sale centre one-way sections','tram crossings near Dane Road','school traffic mornings and afternoons'],'tip':'Washway Road / Marsland Road junction appears on almost every Sale test route. Know your lane by heart.','nearby':['M22','M32','WA14']},
    {'pc':'M34','area':'Denton & Audenshaw','towns':['Denton','Audenshaw','Haughton Green','Dane Bank'],'tc':'Hyde','roads':['Stockport Road','Manchester Road','Ashton Road','Hyde Road','Two Trees Lane'],'landmarks':['Denton Town Hall','Crown Point retail','Victoria Park','Audenshaw Reservoirs'],'challenges':['Crown Point roundabout (M60 J24)','Manchester Road speed and volume','industrial HGV traffic on Two Trees Lane','Audenshaw Road width restrictions'],'tip':'Crown Point roundabout feeds the M60 — multi-lane roundabout skills are tested here constantly.','nearby':['M11','M18','SK14']},
    {'pc':'M35','area':'Failsworth','towns':['Failsworth','Hollinwood','Woodhouses'],'tc':'Failsworth','roads':['Ashton Road West','Oldham Road (A62)','Brierley Street','Propps Hall Drive','Broadway'],'landmarks':['Failsworth Test Centre','Failsworth town centre','Daisy Nook Country Park nearby'],'challenges':['A62 Oldham Road speed and traffic','test-centre traffic during busy test hours','Broadway roundabout','Hollinwood junction interchange'],'tip':'Failsworth Test Centre is HERE — drive these roads frequently. The A62/Broadway roundabout is a common test feature.','nearby':['M11','M40','OL8']},
    {'pc':'M38','area':'Little Hulton & Kearsley','towns':['Little Hulton','Kearsley','Prestolee'],'tc':'Bolton','roads':['Manchester Road','Salford Road','Kenyon Way','Newearth Road','Market Street'],'landmarks':['Little Hulton town centre','Kearsley Mill','Prestolee Lock'],'challenges':['Manchester Road A6 dual carriageway','Kenyon Way speed limit changes','narrow canal bridges at Prestolee','school traffic at Little Hulton'],'tip':'Manchester Road A6 is dual carriageway through Kearsley with 50mph sections — build confidence with speed.','nearby':['M28','M29','BL3']},
    {'pc':'M40','area':'Newton Heath, Collyhurst & Miles Platting','towns':['Newton Heath','Collyhurst','Miles Platting','Monsall'],'tc':'Failsworth','roads':['Oldham Road','Briscoe Lane','Monsall Road','Lightbowne Road','Culcheth Lane'],'landmarks':['Newton Heath industrial area','Miles Platting New Town','Monsall Hospital site'],'challenges':['Oldham Road A62 heavy traffic','railway bridges with height limits','industrial estate junctions','residential speed bumps on Lightbowne Road'],'tip':'Oldham Road carries fast-moving traffic — practise junction timing when turning right across the A62 flow.','nearby':['M4','M9','M35']},
    {'pc':'M41','area':'Urmston & Flixton','towns':['Urmston','Flixton','Davyhulme'],'tc':'Sale','roads':['Flixton Road','Canterbury Road','Higher Road','Stretford Road','the B5214'],'landmarks':['Urmston town centre','Flixton Road shops','Davyhulme Park','Flixton station'],'challenges':['Flixton Road tight parking','railway level crossing on Railway Road','school traffic near Urmston Grammar','residential speed bumps throughout'],'tip':'Railway Road level crossing gates can stay closed for 5+ minutes — patience is tested. Never queue on the tracks.','nearby':['M17','M30','M32']},
    {'pc':'M43','area':'Droylsden','towns':['Droylsden','Greenside','Medlock Vale'],'tc':'Failsworth','roads':['Manchester Road','Ashton Hill Lane','Market Street','Greenside Lane','Sunnyside Road'],'landmarks':['Droylsden Marina','Snipe Retail Park','Metrolink tram stop','Littlemoss High School'],'challenges':['Manchester Road tram crossings','Snipe roundabout (multi-lane)','narrow canalside roads','residential rat-runs'],'tip':'The Metrolink tram crosses Manchester Road at grade — always look both ways and never stop on the tracks.','nearby':['M11','M34','M35']},
    {'pc':'M44','area':'Irlam & Cadishead','towns':['Irlam','Cadishead'],'tc':'Sale','roads':['Liverpool Road','Irlam Road','Station Road','Fairhills Road','Prince\'s Avenue'],'landmarks':['Irlam station','the Manchester Ship Canal','Irlam and Cadishead recreation ground'],'challenges':['Liverpool Road A57 speed and lorries','Ship Canal swing bridge closures','limited junction variety locally','industrial traffic from Cadishead estates'],'tip':'The Ship Canal bridge can close without warning — always have an alternative route planned in your head.','nearby':['M30','M31','WA3']},
    {'pc':'M45','area':'Whitefield','towns':['Whitefield','Unsworth','Sunny Bank'],'tc':'Cheetham Hill','roads':['Bury New Road (A56)','Moss Lane','Elms Street','Hamilton Road','Ringley Road'],'landmarks':['Whitefield town centre','Besses o\' th\' Barn tram stop','the Whitefield Golf Club'],'challenges':['Bury New Road A56 speed','tram crossings at Besses','residential streets with parked cars','Ringley Road bends near the river'],'tip':'Besses o\' th\' Barn tram crossing requires you to check both directions — trams approach quietly and fast.','nearby':['M25','M26','BL8']},
    {'pc':'M46','area':'Atherton & Tyldesley (partial)','towns':['Atherton','Hindsford','Howe Bridge'],'tc':'Bolton','roads':['Bolton Road','Market Street','Mealhouse Lane','Tyldesley Road','Wigan Road'],'landmarks':['Atherton town centre','Howe Bridge Sports Centre','Atherton Central Park'],'challenges':['Bolton Road A579 speed transitions','Atherton centre tight streets','Tyldesley Road narrow sections','Wigan Road dual carriageway merge'],'tip':'Bolton Road A579 switches between 30 and 40mph — watch for repeater signs on lamp posts.','nearby':['M29','BL5','WN2']},
    {'pc':'M50','area':'Salford Quays & MediaCity','towns':['Salford Quays','MediaCityUK','Old Trafford wharf area'],'tc':'Eccles','roads':['the Quays','Broadway','Trafford Road','Erie Basin','Merchants Quay'],'landmarks':['MediaCityUK','the Lowry theatre','Imperial War Museum North','Old Trafford Wharf'],'challenges':['MediaCity roundabout (multi-exit)','pedestrian crossings mid-roundabout','Trafford Road dual carriageway','event traffic at the Lowry'],'tip':'MediaCity roundabout has pedestrian crossings WITHIN the roundabout — check for walkers between exits.','nearby':['M5','M17','M32']},
    # Stockport SK postcodes
    {'pc':'SK1','area':'Stockport Town Centre','towns':['Stockport','Edgeley','Shaw Heath','Lancashire Hill'],'tc':'Bredbury','roads':['the A6 (Wellington Road)','Mersey Way','Heaton Lane','Shaw Heath','Edgeley Road'],'landmarks':['Stockport Viaduct','Merseyway Centre','Stockport Market','Edgeley Park (County FC)','Plaza Cinema'],'challenges':['viaduct underpass complex one-way system','steep hills on Hillgate and Lancashire Hill','busy market-area congestion','multi-lane roundabouts on the A6'],'tip':'Hillgate is one of Stockport\'s steepest hills — perfect for mastering hill starts at traffic lights.','nearby':['SK2','SK3','SK4']},
    {'pc':'SK2','area':'Stockport (Great Moor/Stepping Hill)','towns':['Great Moor','Stepping Hill','Hazel Grove edge','Heaviley'],'tc':'Bredbury','roads':['London Road','Buxton Road','Bramhall Lane','Dialstone Lane','Commercial Road'],'landmarks':['Stepping Hill Hospital','Great Moor Park','Dialstone Lane shops'],'challenges':['Stepping Hill Hospital traffic','London Road A6 width changes','Buxton Road gradient','Dialstone Lane school traffic'],'tip':'Hospital traffic peaks at shift changes (7am, 3pm, 9pm). Plan lessons around these if possible.','nearby':['SK1','SK3','SK7']},
    {'pc':'SK3','area':'Stockport (Heaton Norris/Edgeley South)','towns':['Heaton Norris','Edgeley','Shaw Heath','Adswood'],'tc':'Bredbury','roads':['Wellington Road South','Shaw Heath','Nangreave Road','Greg Street','Adswood Road'],'landmarks':['Stockport station (main line)','Tesco Portwood retail park','Adswood Park'],'challenges':['Wellington Road multi-lane traffic','Portwood roundabout','railway bridge height restrictions','Adswood residential speed bumps'],'tip':'Portwood roundabout feeds A6 and the M60 slip road — lane selection is critical here.','nearby':['SK1','SK4','SK5']},
    {'pc':'SK4','area':'Heaton Moor, Heaton Mersey & Heaton Chapel','towns':['Heaton Moor','Heaton Mersey','Heaton Chapel','Heaton Norris edge'],'tc':'Bredbury','roads':['Heaton Moor Road','Didsbury Road','Wellington Road North','School Lane','Green Lane'],'landmarks':['Heaton Moor Road shops','Heaton Park (different from M25 one)','Priestnall School','Heaton Chapel station'],'challenges':['dense residential parking reducing all roads to single-track','school traffic at 3 schools','steep gradient on Heaton Road','Wellington Road North heavy traffic'],'tip':'Meeting oncoming traffic between parked cars is tested everywhere in SK4. Master the "hold back and give way" protocol.','nearby':['SK3','SK5','M19']},
    {'pc':'SK5','area':'Reddish & Brinnington','towns':['Reddish','Brinnington','Reddish Vale','Reddish North'],'tc':'Bredbury','roads':['Gorton Road','Reddish Road','Broadstone Road','Reddish Lane','North Reddish'],'landmarks':['Reddish Vale Country Park','Reddish Vale viaduct','Houldsworth Mill','Brinnington Park'],'challenges':['Gorton Road railway bridge (narrow, blind)','Reddish industrial area HGVs','Brinnington estate tight corners','Reddish Lane speed bumps'],'tip':'The Gorton Road railway bridge is narrow and blind — slow to 10mph and be ready to give way.','nearby':['SK3','SK4','SK6']},
    {'pc':'SK6','area':'Bredbury & Romiley','towns':['Bredbury','Romiley','Woodley','Bredbury Green'],'tc':'Bredbury','roads':['Stockport Road','George Lane','Ashton Road','Bredbury Green Road','Corcoran Drive'],'landmarks':['Bredbury Test Centre','Woodley precinct','Romiley village','Etherow Country Park nearby'],'challenges':['Bredbury Test Centre exit onto busy Stockport Road','George Lane industrial traffic','Romiley village tight streets','the A560 Ashton Road roundabouts'],'tip':'Your test literally starts from Bredbury. The right-turn exit onto Stockport Road is your FIRST assessed move — nail it.','nearby':['SK5','SK7','SK14']},
    {'pc':'SK7','area':'Bramhall & Hazel Grove','towns':['Bramhall','Hazel Grove','Poynton edge','Woodford'],'tc':'Bredbury','roads':['Bramhall Lane','London Road (A6)','Commercial Road','Macclesfield Road','Woodford Road'],'landmarks':['Bramhall Park','Hazel Grove town centre','Bramhall Village','Poynton roundabout'],'challenges':['A6 London Road dual carriageway merges','Bramhall Lane school traffic','Poynton roundabout multi-lane','Woodford Road country-lane sections'],'tip':'Bramhall Lane between Stepping Hill and Bramhall has school-zone 20mph stretches with cameras.','nearby':['SK2','SK6','SK12']},
    {'pc':'SK8','area':'Cheadle & Gatley','towns':['Cheadle','Cheadle Hulme','Gatley','Heald Green'],'tc':'Bredbury','roads':['Cheadle Road','Wilmslow Road','Stockport Road','the A34','Station Road'],'landmarks':['Cheadle Village','Bruntwood Park','Cheadle Royal retail','Gatley Carrs'],'challenges':['A34 dual carriageway Kingsway merge','Cheadle Village congestion','Gatley Road residential parking','Cheadle Royal roundabout system'],'tip':'The A34 merge at Kingsway is high-speed — build up to traffic pace on the slip road before attempting to merge.','nearby':['SK3','SK4','M22']},
    {'pc':'SK14','area':'Hyde, Gee Cross & Hattersley','towns':['Hyde','Gee Cross','Hattersley','Newton','Flowery Field'],'tc':'Hyde','roads':['Market Street','Mottram Road','Stockport Road','Manchester Road','Dowson Road'],'landmarks':['Hyde Town Hall','Hyde Park (Tameside)','the market','Godley reservoir','Werneth Low'],'challenges':['Mottram Road steep gradients','Hyde centre narrow streets','market-day parking chaos','Hattersley estate tight roads'],'tip':'Hyde Test Centre routes go up Mottram Road — gradient hill starts at traffic lights are almost guaranteed on test day.','nearby':['M34','SK6','OL6']},
    {'pc':'SK15','area':'Stalybridge','towns':['Stalybridge','Millbrook','Carrbrook','Copley'],'tc':'Hyde','roads':['Stamford Street','Mottram Road','Wakefield Road','Huddersfield Road','Rassbottom Street'],'landmarks':['Stalybridge town centre','Stamford Park','Cheetham Park','the Stalybridge Buffet Bar (station)'],'challenges':['steep hills everywhere (Peak District edge)','Stamford Street narrow centre','Huddersfield Road sharp bends','Wakefield Road gradient changes'],'tip':'Stalybridge is the hilliest test area in Greater Manchester — get hill starts and descents perfect.','nearby':['SK14','OL5','OL6']},
    {'pc':'SK16','area':'Dukinfield','towns':['Dukinfield','Globe Lane area'],'tc':'Hyde','roads':['King Street','Astley Street','Park Road','Birch Lane','Old Road'],'landmarks':['Dukinfield town centre','Dukinfield Park','Globe Lane shops'],'challenges':['King Street congestion','Park Road narrow residential','canal bridges with weight limits','school traffic'],'tip':'Dukinfield connects Hyde to Ashton — driving between the two gives excellent varied junction practice.','nearby':['SK14','SK15','OL6']},
]

# ============================================================
# EDUCATIONAL SECTION CONTENT POOLS
# ============================================================
# Each page gets a unique combination from these pools, seeded by filename

MSPSL_SECTIONS = [
    '<h3>MSPSL at Every Junction</h3><p>The MSPSL routine (Mirrors, Signal, Position, Speed, Look) is the foundation of safe driving. In {area}, you will use it at every junction on {road1} and {road2}. Your DriveSQ instructor will call out each step until it becomes automatic.</p>',
    '<h3>The Mirror-Signal Habit</h3><p>Before any change of direction in {area}, check your interior mirror, then the relevant door mirror, then signal. On {road1}, traffic approaches fast — a genuine look in each mirror takes a full second, not a flick.</p>',
    '<h3>Positioning on {area} Roads</h3><p>Correct road position means being in the right lane BEFORE the junction. On {road1}, late lane changes are dangerous. For left turns, position left. For right turns, move right. At {area}\'s roundabouts, follow the lane markings painted on the road.</p>',
]

HAZARD_SECTIONS = [
    '<h3>Hazard Awareness in {area}</h3><p>A developing hazard is anything that might cause you to change speed or direction. In {area}, common hazards include {challenge1} and {challenge2}. DriveSQ trains you to spot them 12 seconds ahead — not 2 seconds.</p>',
    '<h3>Reading the Road in {pc}</h3><p>On {road1}, look beyond the car in front. In {area}, {challenge1} can develop quickly. By scanning further ahead, you buy yourself reaction time — and the examiner sees your head moving, which scores well.</p>',
    '<h3>Pedestrian Awareness Near {landmark}</h3><p>Near {landmark} in {area}, pedestrians may step into the road unexpectedly. DriveSQ teaches the "cover the brake" technique — hovering your foot over the brake pedal when driving past high-risk areas. This shaves critical milliseconds off your reaction time.</p>',
]

MANOEUVRE_SECTIONS = [
    '<h3>Parallel Parking in {area}</h3><p>Many {area} streets have parked cars on both sides. Parallel parking is not just a test skill — it is a daily necessity in {pc}. DriveSQ teaches a reference-point method: pull alongside, check mirrors, reverse with one turn left, straighten at 45 degrees, one turn right to finish.</p>',
    '<h3>Bay Parking Practice Spots</h3><p>DriveSQ instructors know the quietest car parks in {area} for bay-parking practice. We cover both forward and reverse bay parking using reference points that work in any car park. The DVSA can ask for either on test day — we prepare you for both.</p>',
    '<h3>The Pull-Up-on-the-Right Manoeuvre</h3><p>This manoeuvre requires you to pull up on the right side of the road, reverse two car lengths, and rejoin traffic. In {area}, we practise on quiet residential streets near {landmark}. The key is observation — check mirrors and blind spots before every stage.</p>',
]

TEST_PREP_SECTIONS = [
    '<h3>Your Nearest Test Centre: {tc}</h3><p>{tc} Test Centre handles practical tests for the {area} ({pc}) area. DriveSQ instructors drive these routes weekly — we know which junctions examiners favour, where they ask for manoeuvres, and which roads have common fail points.</p>',
    '<h3>Mock Tests on Real Routes</h3><p>DriveSQ runs full 40-minute mock tests on {tc} Test Centre routes. We score you on a real DL25 marking sheet, debrief your three weakest areas, and build targeted practice around them. Most learners take 2 mock tests before their real test.</p>',
    '<h3>Test-Day Routine</h3><p>On test morning, DriveSQ provides a warm-up lesson covering your weakest skill. We drive to {tc} Test Centre, you take the test, and your instructor waits. If you pass — celebration. If not — we debrief immediately and plan your next steps. No judgment either way.</p>',
]

OFFERS_SECTION = '''<div style="background:linear-gradient(135deg,#D10A11,#ff4444);border-radius:16px;padding:28px;color:#fff;margin:28px 0">
<h3 style="color:#fff;font-family:'Oswald',sans-serif;font-size:1.3rem;margin-bottom:10px">⚡ DriveSQ Offers for {area}</h3>
<ul style="list-style:none;padding:0">
<li style="margin:8px 0">✓ <strong>£35/hr</strong> — manual OR automatic, same price</li>
<li style="margin:8px 0">✓ <strong>10-hour block: £330</strong> (save £20)</li>
<li style="margin:8px 0">✓ <strong>PassFirst guarantee</strong> — FREE support lessons if you fail</li>
<li style="margin:8px 0">✓ <strong>Intensive courses</strong> — pass in 1-2 weeks</li>
<li style="margin:8px 0">✓ <strong>Same instructor</strong> every lesson</li>
</ul>
</div>'''

# ============================================================
# PAGE BUILDER (Homepage-matching dark theme)
# ============================================================
def build_postcode_page(data):
    pc = data['pc']
    area = data['area']
    area_slug = area.lower().replace(" ","").replace("&","").replace("(","").replace(")","").replace("/","-").replace("'","")
    slug = f'{pc.lower()}-driving-lessons-{area_slug}'
    slug = re.sub(r'[^a-z0-9-]','',slug)
    filename = f'{slug}.html'
    url = f'https://www.drivesq.co.uk/{filename}'
    
    seed = int(hashlib.md5(filename.encode()).hexdigest()[:8], 16)
    rng = random.Random(seed)
    
    towns_str = ', '.join(data['towns'][:-1]) + f' and {data["towns"][-1]}' if len(data['towns'])>1 else data['towns'][0]
    roads_str = ', '.join(data['roads'][:3])
    
    # Pick unique content sections
    mspsl = rng.choice(MSPSL_SECTIONS).format(**{
        'area':area,'pc':pc,'road1':data['roads'][0],'road2':data['roads'][1] if len(data['roads'])>1 else data['roads'][0],
        'landmark':rng.choice(data['landmarks']),'challenge1':data['challenges'][0],'challenge2':data['challenges'][1] if len(data['challenges'])>1 else data['challenges'][0],
        'tc':data['tc']
    })
    hazard = rng.choice(HAZARD_SECTIONS).format(**{
        'area':area,'pc':pc,'road1':data['roads'][0],'road2':data['roads'][1] if len(data['roads'])>1 else data['roads'][0],
        'landmark':rng.choice(data['landmarks']),'challenge1':data['challenges'][0],'challenge2':data['challenges'][1] if len(data['challenges'])>1 else data['challenges'][0],
        'tc':data['tc']
    })
    manoeuvre = rng.choice(MANOEUVRE_SECTIONS).format(**{
        'area':area,'pc':pc,'road1':data['roads'][0],'road2':data['roads'][1] if len(data['roads'])>1 else data['roads'][0],
        'landmark':rng.choice(data['landmarks']),'challenge1':data['challenges'][0],'challenge2':data['challenges'][1] if len(data['challenges'])>1 else data['challenges'][0],
        'tc':data['tc']
    })
    testprep = rng.choice(TEST_PREP_SECTIONS).format(**{
        'area':area,'pc':pc,'road1':data['roads'][0],'road2':data['roads'][1] if len(data['roads'])>1 else data['roads'][0],
        'landmark':rng.choice(data['landmarks']),'challenge1':data['challenges'][0],'challenge2':data['challenges'][1] if len(data['challenges'])>1 else data['challenges'][0],
        'tc':data['tc']
    })
    offers = OFFERS_SECTION.format(area=area)
    
    img1 = rng.choice(list(IMGS.values()))
    img2 = rng.choice([v for v in IMGS.values() if v != img1])
    img3 = rng.choice([v for v in IMGS.values() if v not in (img1,img2)])
    
    title = f'Driving Lessons {area} ({pc}) — DVSA-Approved, £35/hr | DriveSQ'
    h1 = f'Driving Lessons in {area} ({pc})'
    desc = f'Professional driving lessons in {area} ({pc}) from £35/hr. DVSA-approved instructors, test-route practice at {data["tc"]} Test Centre, WhatsApp booking. Manual & automatic same price.'
    
    # Unique intro paragraph
    intros = [
        f'Looking for driving lessons in {area}? DriveSQ brings DVSA-approved instruction right to your {pc} doorstep. We teach on the roads you actually use — {roads_str} — and practise test routes from {data["tc"]} Test Centre. Whether you are a complete beginner or need a confidence refresher, our structured lessons get you test-ready efficiently.',
        f'DriveSQ covers the entire {pc} area, from {data["towns"][0]} to {data["towns"][-1]}. Our local instructors know every junction, speed limit, and examiner trick on {area}\'s roads. We pick you up from home, work, or university and teach in modern dual-controlled cars — manual or automatic at the same £35/hr price.',
        f'Start your driving journey in {area} with DriveSQ — Manchester\'s top-rated driving school. Our {pc}-area instructors have helped hundreds of local learners pass at {data["tc"]} Test Centre. From your first lesson on quiet {data["towns"][0]} streets to your test-day drive on {data["roads"][0]}, we build your skills progressively.',
    ]
    intro = rng.choice(intros)
    
    # Unique local challenges paragraph
    challenges_para = f'Driving in {area} has specific challenges that generic lesson plans miss. {data["challenges"][0].capitalize()} requires confident observation and decisiveness. {data["challenges"][1].capitalize() if len(data["challenges"])>1 else ""} On {data["roads"][0]}, traffic patterns change throughout the day. DriveSQ instructors live and teach in {pc} — we train you for every scenario you will face.'
    
    # Unique FAQ
    faqs = [
        (f'How much do driving lessons cost in {area} ({pc})?', f'DriveSQ lessons in {area} are £35/hr for manual or automatic — same price. 10-hour blocks cost £330 (save £20). Our PassFirst package includes free support lessons if you don\'t pass first time.'),
        (f'Where is the nearest test centre to {pc}?', f'The nearest practical test centre to {area} is {data["tc"]} Test Centre. DriveSQ lessons include regular practice on the routes examiners use from this centre.'),
        (f'Do you offer automatic lessons in {area}?', f'Yes — DriveSQ offers automatic and manual lessons in {area} ({pc}) at the same price (£35/hr). No surcharge for automatic. Over 40% of our {pc} learners choose automatic.'),
        (f'How many lessons will I need in {area}?', f'The DVSA average is 45 hours of professional tuition. In {area}, our learners typically need 35-50 hours depending on confidence and local road complexity. DriveSQ tracks your progress so you always know where you stand.'),
        (f'Can you pick me up from home in {pc}?', f'Absolutely. DriveSQ provides door-to-door pickup across all of {pc}, including {towns_str}. We also collect from workplaces and universities in the area.'),
    ]
    rng.shuffle(faqs)
    faqs = faqs[:4]
    
    faq_schema = json.dumps({"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
        {"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q,a in faqs
    ]})
    
    local_schema = json.dumps({"@context":"https://schema.org","@type":"DrivingSchool","name":"DriveSQ","url":url,
        "telephone":"+447352932003","logo":LOGO,
        "description":desc,"priceRange":"£35-£36",
        "areaServed":{"@type":"Place","name":f'{area} ({pc})'},
        "address":{"@type":"PostalAddress","addressLocality":area,"postalCode":pc,"addressRegion":"Greater Manchester","addressCountry":"GB"}
    })
    
    # Nearby links
    nearby_pcs = data.get('nearby',[])
    nearby_html = ''
    for npc in nearby_pcs:
        nearby_html += f'<a href="/{npc.lower()}-driving-lessons.html" class="nb-link">{npc}</a> '
    
    html = f'''<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<title>{html_mod.escape(title)}</title>
<meta name="description" content="{html_mod.escape(desc)}"/>
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large"/>
<link rel="canonical" href="{url}"/>
<meta property="og:type" content="website"/>
<meta property="og:url" content="{url}"/>
<meta property="og:title" content="{html_mod.escape(title)}"/>
<meta property="og:description" content="{html_mod.escape(desc)}"/>
<meta property="og:image" content="{IMGS['pass']}"/>
<meta property="og:site_name" content="DriveSQ"/>
<meta property="og:locale" content="en_GB"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="{html_mod.escape(title)}"/>
<meta name="twitter:description" content="{html_mod.escape(desc)}"/>
<meta name="twitter:image" content="{IMGS['pass']}"/>
<link rel="icon" type="image/png" href="{LOGO}"/>
<script type="application/ld+json">{faq_schema}</script>
<script type="application/ld+json">{local_schema}</script>
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"/>
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet"/>
<style>
:root{{--red:#D10A11;--red2:#a80008;--blk:#080808;--dk:#111;--dk2:#181818;--bdr:#2a2a2a;--txt:#f0f0f0;--muted:#888;--green:#25D366;--r:12px;--sh:0 8px 40px rgba(0,0,0,.65);}}
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0;}}
html{{scroll-behavior:smooth;scroll-padding-top:72px;}}
body{{background:var(--blk);color:var(--txt);font-family:'Inter',sans-serif;line-height:1.7;}}
h1,h2,h3,h4{{font-family:'Oswald',sans-serif;line-height:1.1;letter-spacing:.3px;}}
a{{color:var(--red);text-decoration:none;}} a:hover{{color:#ff4444;}}
img{{max-width:100%;height:auto;display:block;border-radius:var(--r);}}
::selection{{background:var(--red);color:#fff;}}
.nav-main{{background:rgba(8,8,8,.97);backdrop-filter:blur(12px);border-bottom:1px solid var(--bdr);position:sticky;top:0;z-index:100;}}
.nav-main .container{{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;max-width:1200px;margin:0 auto;}}
.nav-logo{{display:flex;align-items:center;gap:10px;text-decoration:none;}}
.nav-logo img{{width:48px;height:48px;border-radius:50%;border:2px solid var(--red);}}
.nav-logo span{{color:#fff;font-family:'Oswald',sans-serif;font-size:1.3rem;font-weight:700;}} .nav-logo span b{{color:var(--red);}}
.nav-links{{display:flex;gap:20px;align-items:center;}} .nav-links a{{color:#ccc;font-weight:600;font-size:.88rem;}} .nav-links a:hover{{color:var(--red);}}
.nav-cta{{background:var(--green);color:#fff!important;padding:8px 18px;border-radius:999px;font-weight:700;font-size:.85rem;}} .nav-cta:hover{{background:#1da851;}}
@media(max-width:768px){{.nav-links{{display:none;}}}}
.hero{{background:linear-gradient(135deg,#0a0000 0%,#1a0505 50%,var(--blk) 100%);padding:64px 0 52px;position:relative;overflow:hidden;}}
.hero::after{{content:'';position:absolute;bottom:0;left:0;right:0;height:80px;background:linear-gradient(transparent,var(--blk));}}
.hero h1{{font-size:2.4rem;font-weight:700;color:#fff;}} .hero h1 b{{color:var(--red);}}
.hero .sub{{color:var(--muted);font-size:1.05rem;max-width:650px;margin-top:14px;}}
.hero .badges{{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px;}}
.badge-item{{background:var(--dk2);border:1px solid var(--bdr);border-radius:999px;padding:6px 16px;font-size:.82rem;color:var(--txt);font-weight:600;}}
.badge-item i{{color:var(--red);margin-right:4px;}}
.sect{{padding:52px 0;}} .sect-alt{{background:var(--dk);}}
.container{{max-width:1100px;margin:0 auto;padding:0 16px;}}
h2{{font-size:1.6rem;color:#fff;margin-bottom:18px;}}
h2 .accent{{color:var(--red);}}
.card-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;}}
.dcard{{background:var(--dk2);border:1px solid var(--bdr);border-radius:var(--r);padding:24px;transition:transform .2s;}}
.dcard:hover{{transform:translateY(-3px);border-color:var(--red);}}
.dcard i{{font-size:1.6rem;color:var(--red);margin-bottom:10px;display:block;}}
.dcard h3{{font-size:1rem;font-family:'Oswald',sans-serif;margin-bottom:6px;color:#fff;}}
.dcard p{{color:var(--muted);font-size:.9rem;}}
.img-text{{display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:center;}}
@media(max-width:768px){{.img-text{{grid-template-columns:1fr;}} .hero h1{{font-size:1.7rem;}}}}
.tip-box{{background:rgba(209,10,17,.08);border:1px solid rgba(209,10,17,.25);border-radius:var(--r);padding:18px;margin:20px 0;}}
.tip-box strong{{color:var(--red);}}
.faq-item{{border-bottom:1px solid var(--bdr);padding:16px 0;}}
.faq-q{{font-weight:700;font-size:.95rem;color:#fff;font-family:'Oswald',sans-serif;margin-bottom:4px;}}
.faq-a{{color:var(--muted);font-size:.9rem;}}
.cta-band{{background:linear-gradient(135deg,var(--red),#ff3333);padding:40px 0;text-align:center;}}
.cta-band h2{{color:#fff;margin-bottom:10px;}}
.cta-band p{{color:rgba(255,255,255,.85);margin-bottom:18px;}}
.btn-w{{background:#fff;color:var(--red);padding:13px 30px;border-radius:999px;font-weight:700;display:inline-block;margin:5px;font-size:.95rem;transition:transform .2s;}}
.btn-w:hover{{transform:translateY(-2px);color:var(--red);}}
.wa-float{{position:fixed;bottom:24px;right:24px;background:var(--green);color:#fff;width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;text-decoration:none;box-shadow:0 4px 20px rgba(37,211,102,.5);z-index:999;transition:transform .2s;animation:pulse 2s infinite;}}
.wa-float:hover{{transform:scale(1.1);color:#fff;}}
@keyframes pulse{{0%,100%{{box-shadow:0 4px 20px rgba(37,211,102,.5)}}50%{{box-shadow:0 4px 30px rgba(37,211,102,.8)}}}}
.nb-link{{background:var(--dk2);border:1px solid var(--bdr);padding:6px 14px;border-radius:999px;font-size:.85rem;color:var(--txt);font-weight:600;display:inline-block;margin:4px;}} .nb-link:hover{{border-color:var(--red);color:var(--red);}}
.vid-wrap{{border-radius:var(--r);overflow:hidden;box-shadow:var(--sh);margin:20px 0;}}
footer{{background:var(--blk);border-top:1px solid var(--bdr);padding:28px 0;color:var(--muted);font-size:.83rem;text-align:center;}}
footer a{{color:#aaa;}} footer a:hover{{color:var(--red);}}
</style>
</head>
<body>

<nav class="nav-main"><div class="container">
<a class="nav-logo" href="/"><img src="{LOGO}" alt="DriveSQ" width="48" height="48"/><span>Drive<b>SQ</b></span></a>
<div class="nav-links">
<a href="/">Home</a>
<a href="/#pricing">Pricing</a>
<a href="/driving-lessons-near-me-manchester.html">Areas</a>
<a href="/manchester-test-centres-guide.html">Test Centres</a>
<a href="{WA}" class="nav-cta"><i class="bi bi-whatsapp me-1"></i>Book Now</a>
</div>
</div></nav>

<header class="hero"><div class="container">
<h1>Driving Lessons in <b>{area}</b> ({pc})</h1>
<p class="sub">{intro}</p>
<div class="badges">
<span class="badge-item"><i class="bi bi-patch-check-fill"></i>DVSA Approved</span>
<span class="badge-item"><i class="bi bi-currency-pound"></i>£35/hr Auto & Manual</span>
<span class="badge-item"><i class="bi bi-lightning-charge-fill"></i>PassFirst Guarantee</span>
<span class="badge-item"><i class="bi bi-geo-alt-fill"></i>{pc} Local Instructor</span>
</div>
</div></header>

<section class="sect"><div class="container">
<h2>Why Learn to Drive in <span class="accent">{area}</span>?</h2>
<div class="img-text">
<div>
<p>{challenges_para}</p>
<div class="tip-box"><strong><i class="bi bi-lightbulb me-1"></i>Local tip:</strong> {data['tip']}</div>
</div>
<div><img src="{img1}" alt="Driving lessons {area}" loading="lazy" width="540" height="360"/></div>
</div>
</div></section>

<section class="sect sect-alt"><div class="container">
<h2>What You'll <span class="accent">Learn</span></h2>
<div class="card-grid">
<div class="dcard"><i class="bi bi-signpost-split"></i><h3>MSPSL & Junctions</h3>{mspsl}</div>
<div class="dcard"><i class="bi bi-exclamation-triangle"></i><h3>Hazard Awareness</h3>{hazard}</div>
<div class="dcard"><i class="bi bi-arrows-move"></i><h3>Manoeuvres</h3>{manoeuvre}</div>
<div class="dcard"><i class="bi bi-clipboard-check"></i><h3>Test Preparation</h3>{testprep}</div>
</div>
</div></section>

<section class="sect"><div class="container">
<h2><span class="accent">{area}</span> Roads & Landmarks</h2>
<div class="img-text">
<div><img src="{img2}" alt="{area} driving roads" loading="lazy" width="540" height="360"/></div>
<div>
<p><strong>Key roads:</strong> {', '.join(data['roads'])}</p>
<p><strong>Landmarks:</strong> {', '.join(data['landmarks'])}</p>
<p><strong>Covering:</strong> {towns_str}</p>
<p><strong>Test centre:</strong> {data['tc']} Test Centre</p>
<p><strong>Common challenges:</strong> {', '.join(data['challenges'][:3])}</p>
</div>
</div>
</div></section>

<section class="sect sect-alt"><div class="container">
<h2>Watch DriveSQ <span class="accent">in Action</span></h2>
<div class="vid-wrap">
<video src="{VIDEO}" controls preload="metadata" poster="{img3}" style="width:100%;display:block" width="800" height="450"></video>
</div>
<p style="color:var(--muted);font-size:.85rem;margin-top:8px">A real DriveSQ lesson on Manchester roads — the same structured approach we use in {area}.</p>
</div></section>

<section class="sect"><div class="container">
{offers}
</div></section>

<section class="sect sect-alt"><div class="container">
<h2>Frequently Asked <span class="accent">Questions</span></h2>
{''.join(f'<div class="faq-item"><div class="faq-q">{q}</div><div class="faq-a">{a}</div></div>' for q,a in faqs)}
</div></section>

{'<section class="sect"><div class="container"><h2>Nearby <span class="accent">Areas</span></h2><div>' + nearby_html + '</div></div></section>' if nearby_html else ''}

<section class="cta-band"><div class="container">
<h2>Start Driving in {area} Today</h2>
<p>DVSA-approved lessons from £35/hr. WhatsApp us now for instant booking.</p>
<a href="{WA}" class="btn-w"><i class="bi bi-whatsapp me-2"></i>WhatsApp Us</a>
<a href="tel:+447352932003" class="btn-w"><i class="bi bi-telephone me-2"></i>07352 932003</a>
</div></section>

<a href="{WA}" class="wa-float" aria-label="WhatsApp DriveSQ"><i class="bi bi-whatsapp"></i></a>

<footer><div class="container">
<p>&copy; 2026 DriveSQ — Professional Driving School, Greater Manchester</p>
<p><a href="/privacy.html">Privacy</a> &middot; <a href="/terms.html">Terms</a> &middot; <a href="{WA}">WhatsApp</a> &middot; <a href="tel:+447352932003">07352 932003</a></p>
</div></footer>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>'''
    
    return filename, html

# ============================================================
# GENERATE ALL PAGES
# ============================================================
count = 0
for data in POSTCODES:
    filename, html = build_postcode_page(data)
    with open(filename, 'w') as f:
        f.write(html)
    count += 1
    print(f'{count}. {filename}')

print(f'\nTotal postcode pages generated: {count}')
