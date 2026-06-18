#!/usr/bin/env python3
"""
Generate unique postcode pages for ALL Manchester & Stockport areas.
Each page has genuinely unique vocabulary, sentence structure, and content.
"""
import os, json, hashlib, random, html as html_mod, re
os.chdir('/home/user/DRIVESQ-WEBSITE')

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

POSTCODES = [
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
# MASSIVE CONTENT POOLS — 12+ variants each, completely different vocabulary
# ============================================================

MSPSL_SECTIONS = [
    '<p>The MSPSL routine (Mirrors, Signal, Position, Speed, Look) underpins every junction approach in {area}. On {road1}, you will execute this sequence dozens of times per lesson. DriveSQ instructors break it into muscle memory through repetition until each step flows without conscious thought.</p>',
    '<p>Before altering course anywhere in {pc}, the sequence is always: interior mirror, relevant door mirror, signal, adjust position, regulate speed, then look. On {road1}, traffic closes gaps fast — skipping any step invites danger. We drill this until it becomes reflex.</p>',
    '<p>Lane discipline on {road1} separates competent drivers from nervous ones. Position yourself in the correct lane 100 metres before the turn, not 10. In {area}, road markings guide you — follow them precisely. DriveSQ teaches you to read junction layout from a distance so lane choice is decided early.</p>',
    '<p>Approaching junctions on {road2} demands a structured routine. DriveSQ uses the Mirrors-Signal-Position-Speed-Look framework adapted specifically for {area} roads. Your instructor demonstrates each component at slow speed first, then builds to real-time traffic flow as your confidence grows.</p>',
    '<p>The difference between a test pass and a serious fault often comes down to mirror checks. In {area}, where {challenge1} is common, a thorough glance — holding each mirror for a full second — tells the examiner you are genuinely assessing risk, not just going through the motions.</p>',
    '<p>Signalling timing matters. Too early on {road1} confuses drivers behind you; too late gives them no warning. DriveSQ teaches the "six car-lengths" rule: signal when you are approximately six car-lengths from your turn, adjusting for traffic speed and conditions specific to {area}.</p>',
    '<p>Speed management through {area} junctions requires anticipation. On {road2}, traffic lights have predictable phasing — your DriveSQ instructor will teach you the timing patterns so you can adjust speed smoothly rather than braking harshly at every amber light.</p>',
    '<p>Every right turn across oncoming traffic on {road1} demands a gap assessment. In {area}, DriveSQ teaches the "three-second rule" — if the approaching vehicle reaches you in under three seconds, wait. This judgement develops through guided practice at progressively busier junctions.</p>',
    '<p>Emerging from side roads onto {road1} tests observation and decisiveness equally. DriveSQ introduces {area} learners to quiet T-junctions first, building towards the complex multi-lane junctions that characterise {pc} roads. Each step up only happens when you are ready.</p>',
    '<p>Roundabout approaches in {area} follow MSPSL with an added layer: lane selection based on exit number. On roundabouts near {landmark}, DriveSQ teaches the "clock face" method — your exit position on the imaginary clock determines your approach lane and signal sequence.</p>',
    '<p>At traffic-light junctions on {road2}, many {pc} learners struggle with the amber-light dilemma. DriveSQ teaches the "point of no return" concept — beyond a certain distance at a certain speed, stopping safely is impossible. Recognising that threshold avoids both harsh braking and running red lights.</p>',
    '<p>Dual carriageway junctions on {road1} add complexity through higher speeds. DriveSQ builds {area} learners up gradually — starting with quiet 30mph junctions before progressing to the faster, multi-lane intersections that {pc} driving inevitably involves.</p>',
]

HAZARD_SECTIONS = [
    '<p>Developing hazards in {area} include {challenge1} and vehicles pulling out from side roads on {road1}. DriveSQ trains you to scan 12 seconds ahead — roughly the length of three lamp posts at 30mph — giving you maximum reaction time.</p>',
    '<p>Pedestrian behaviour near {landmark} is unpredictable. People step into the road without looking, especially near bus stops and shop fronts. DriveSQ teaches the "cover and hover" method: lifting your foot off the accelerator and hovering it over the brake when passing high-risk zones.</p>',
    '<p>Cyclists on {road2} require a minimum 1.5-metre passing gap. In {area}, narrow sections make this impossible without crossing the centre line. DriveSQ teaches you to wait behind rather than squeezing past — the examiner marks an unsafe overtake as a serious fault.</p>',
    '<p>Parked vehicles on {road1} create hidden dangers. Doors can open without warning, and pedestrians — especially children — can appear suddenly from between cars. In {area}, DriveSQ teaches the "door zone" technique: maintaining at least one metre clearance from parked vehicles at all times.</p>',
    '<p>Weather changes driving conditions across {area} dramatically. Wet roads on {road1} double your stopping distance. DriveSQ ensures {pc} learners practise in rain, low sun, and darkness — real conditions that the driving test does not avoid.</p>',
    '<p>{area} roads present hazards that textbooks cannot replicate. {challenge2} creates situations unique to {pc}. DriveSQ instructors who live locally anticipate these hazards because they drive through them daily — transferring that instinct to you through guided commentary driving.</p>',
    '<p>The hazard perception test requires you to spot developing dangers on video clips. In {area}, DriveSQ supplements this with real-world commentary driving on {road1} — your instructor asks "what could go wrong here?" at every junction, training your eyes to find risk before it materialises.</p>',
    '<p>Lorries and buses on {road1} block your forward view. In {area}, where {challenge1} is constant, DriveSQ teaches strategic positioning: dropping back from large vehicles creates a wider field of vision and more time to react to whatever emerges ahead of them.</p>',
    '<p>Junctions near {landmark} demand 360-degree awareness. Vehicles approach from unexpected angles, and road layout can mislead unfamiliar drivers. DriveSQ learners in {area} practise these specific junctions repeatedly until every approach angle feels instinctive.</p>',
    '<p>Night driving through {area} introduces glare from oncoming headlights on {road2}. DriveSQ teaches you to look at the left kerb line rather than directly at approaching lights — maintaining your night vision while keeping directional awareness.</p>',
    '<p>Motorcyclists filtering through {area} traffic on {road1} approach faster than you expect. DriveSQ teaches {pc} learners to check mirrors before any lateral movement — a motorcycle can appear in your blind spot within two seconds of your last check.</p>',
    '<p>Road works on {road2} are frequent in {area} due to ongoing infrastructure projects. Temporary traffic lights, lane narrowing, and contraflows test your adaptability. DriveSQ runs dedicated lessons through active road-works zones so you respond calmly, not anxiously.</p>',
]

MANOEUVRE_SECTIONS = [
    '<p>Parallel parking between cars on {area} streets is a survival skill, not just a test exercise. DriveSQ teaches a reference-point system calibrated to our dual-controlled car: pull alongside, steer left, watch the kerb in your left mirror, straighten when the car sits 30cm from the edge.</p>',
    '<p>Reverse bay parking appears on roughly half of all driving tests. DriveSQ identifies the quietest car parks in {area} for distraction-free practice. We teach a methodical approach: select your bay, check all mirrors, reverse slowly using the painted lines as your guide.</p>',
    '<p>The pull-up-on-the-right manoeuvre requires you to cross traffic, park on the right, reverse two car-lengths, then rejoin the flow. In {area}, DriveSQ selects quiet residential roads near {landmark} where traffic is light enough to build your confidence before attempting busier streets.</p>',
    '<p>Forward bay parking uses different reference points from reverse bay parking. DriveSQ covers both in {area} because the examiner can request either. Our instructors demonstrate the turning point relative to the bay lines, then you practise until the alignment feels natural.</p>',
    '<p>Hill starts feature prominently in {area} due to the gradient on {road2}. DriveSQ teaches precise bite-point control — holding the clutch at the exact friction point while releasing the handbrake smoothly. In an automatic, we cover creep control and brake-to-accelerator transition on slopes.</p>',
    '<p>Emergency stops in {area} happen on quiet stretches of {road1} where DriveSQ can safely simulate the exercise. You apply maximum braking pressure while keeping the steering straight, then check mirrors before moving off again. We repeat this until your muscle memory is instant and accurate.</p>',
    '<p>Turning in the road is no longer on the DVSA test, but DriveSQ still teaches it because {area} streets sometimes require a three-point turn. Narrow roads near {landmark} provide realistic practice — full lock left, reverse with full lock right, then straighten and drive away.</p>',
    '<p>Reversing around corners builds spatial awareness that transfers to every other manoeuvre. On quiet {area} side streets, DriveSQ teaches you to use the kerb in your left mirror as your guide — keeping a consistent distance through the curve. Observation checks happen before and during every reversal.</p>',
    '<p>Controlled stops — pulling up on the left precisely where the examiner indicates — seem simple but account for numerous minor faults. In {area}, DriveSQ practises this at varied locations: alongside kerbs with dropped crossings, near junctions, and on slopes, each requiring slightly different technique.</p>',
    '<p>DriveSQ teaches every manoeuvre in three phases: demonstration, guided practice, and independent execution. In {area}, we select practice locations that mirror test-day conditions — similar road widths, gradients, and traffic levels to those around {tc} Test Centre routes.</p>',
    '<p>Clutch control at slow speed determines whether your manoeuvres look smooth or jerky. DriveSQ dedicates specific {area} lessons to "clutch crawl" exercises — moving the car at walking pace using clutch alone, building the foot sensitivity that makes parking and reversing effortless.</p>',
    '<p>During any reversing manoeuvre in {area}, observation is worth more than steering accuracy. DriveSQ trains you to check all blind spots before moving, pause if any road user approaches, and restart only when it is completely clear. Examiners fail candidates who reverse without adequate all-round checks.</p>',
]

TEST_PREP_SECTIONS = [
    '<p>{tc} Test Centre administers practical tests for {area} ({pc}) learners. DriveSQ instructors drive these exact routes weekly, identifying the junctions that generate the most serious faults and building targeted practice sessions around them.</p>',
    '<p>DriveSQ conducts full 40-minute mock examinations replicating {tc} Test Centre routes. We use an official DL25 marking sheet, debrief your weakest three areas afterwards, and restructure your remaining lessons to address those specific gaps.</p>',
    '<p>On your test morning, DriveSQ provides a one-hour warm-up lesson focusing on the skill you find hardest. We drive to {tc} Test Centre, you take the examination, and your instructor waits in the car park. Afterwards, we review the result together — pass or fail — with zero judgement.</p>',
    '<p>Theory test preparation runs alongside practical lessons at DriveSQ. While driving through {area}, your instructor links real-world situations to theory questions — "what would the Highway Code say about this junction?" This dual approach means theory and practical reinforce each other.</p>',
    '<p>Show-me-tell-me questions open every practical test. DriveSQ provides a laminated card covering all 19 possible questions and practises them during {area} lessons. By test day, you can answer any combination without hesitation — removing one source of test-day anxiety entirely.</p>',
    '<p>Independent driving makes up 20 minutes of your test from {tc}. You follow either a sat-nav or road signs. DriveSQ practises both methods on {area} roads — the sat-nav with voice guidance, and sign-following along routes the examiner actually uses.</p>',
    '<p>Test nerves affect even well-prepared learners. DriveSQ addresses this by gradually increasing lesson pressure in {area}: adding commentary requests, simulating examiner instructions, and running timed exercises. By test day at {tc}, the format feels familiar rather than frightening.</p>',
    '<p>The DL25 marking sheet distinguishes driving faults (minor), serious faults, and dangerous faults. DriveSQ teaches {area} learners exactly where the lines are — for example, a late mirror check is minor, but failing to check at all before changing lane on {road1} is serious. Precision matters.</p>',
    '<p>Waiting times at {tc} Test Centre vary seasonally. DriveSQ advises {area} learners to book their test 8-10 weeks in advance, continuing weekly lessons throughout. This sustained practice means your skills peak on test day rather than fading during a long gap between booking and sitting.</p>',
    '<p>After a failed test from {tc}, DriveSQ provides a free 30-minute debrief lesson. We drive the exact section where the serious fault occurred, identify the root cause, and drill the correct response. Most {area} learners who fail with DriveSQ pass comfortably on their second attempt.</p>',
    '<p>The practical test lasts approximately 40 minutes and covers around 8 miles of road. From {tc} Test Centre, routes traverse a mix of residential streets, dual carriageways, and roundabouts. DriveSQ ensures {area} learners have driven every likely route segment multiple times before test day.</p>',
    '<p>DriveSQ tracks your progress using a digital skills matrix. Each {area} lesson updates your competency across 24 DVSA criteria. When all criteria reach "test standard", your instructor recommends booking at {tc}. This data-driven approach prevents premature test attempts and wasted fees.</p>',
]

# Unique intro templates — 12 variants
INTRO_TEMPLATES = [
    'Searching for driving lessons in {area}? DriveSQ delivers DVSA-approved tuition right across {pc}. We teach on the roads you actually travel — {roads_str} — and rehearse test routes from {tc} Test Centre. Whether you are a first-time learner or returning after a break, our structured programme gets you examination-ready efficiently.',
    'DriveSQ operates throughout the {pc} district, from {town_first} to {town_last}. Our resident instructors understand every junction, speed restriction, and examiner preference on {area} roads. We collect you from home, work, or college and teach in modern dual-controlled vehicles — manual or automatic at an identical £35 per hour.',
    'Begin your driving journey in {area} with DriveSQ — one of Greater Manchester\'s highest-rated driving schools. Our {pc}-based instructors have guided hundreds of local learners to success at {tc} Test Centre. From introductory manoeuvres on quiet {town_first} streets to confident driving on {road1}, we develop your abilities progressively.',
    'Passing your driving test in {area} requires local knowledge that national chains simply lack. DriveSQ instructors live in {pc} — we know where examiners turn, which roads are busiest at school time, and exactly how to navigate {road1} during rush hour. That hyper-local expertise translates directly into higher pass rates.',
    'DriveSQ has taught learners across {area} for years, building a reputation on first-time passes and genuine care. Every lesson in {pc} follows a structured DVSA syllabus adapted to local roads. We cover {roads_str} and every junction type you will encounter on your {tc} test route.',
    'Your {pc} driving lessons with DriveSQ combine structured DVSA training with intimate local road knowledge. We cover everything from clutch control on {town_first} side streets to dual carriageway confidence on {road1}. Manual and automatic tuition costs the same — £35 per hour, no hidden extras.',
    'Learning to drive in {area} presents unique challenges that only a local school understands. {challenge1_cap} demands specific skills that DriveSQ instructors teach from lesson one. We provide door-to-door collection across {pc} and flexible scheduling around your work, school, or university timetable.',
    'DriveSQ brings professional, patient driving instruction to every street in {pc}. Our {area} lessons are built around the roads you will actually use after passing — {roads_str}. We do not follow a generic national curriculum; every session is tailored to the hazards and junctions specific to your neighbourhood.',
    'Thousands of {area} residents have earned their driving licence with DriveSQ. Our {pc} instructors hold DVSA-approved instructor certificates and undergo annual CPD training. Lessons run seven days a week, with early morning and evening availability designed around busy {area} lifestyles.',
    'Whether you live near {landmark} or on the far side of {pc}, DriveSQ reaches you. Our local {area} instructors plan each lesson to combine new skills with familiar roads — so you are never lost and always learning. We match you with one dedicated instructor for consistency throughout your training.',
    'DriveSQ\'s {area} programme starts with an honest assessment lesson. We evaluate your current ability on local {pc} roads, set a realistic lesson target, and map out a personalised route to your test at {tc}. No upselling, no padding — just focused instruction that respects your time and budget.',
    'Choosing a driving school in {area} comes down to three things: instructor quality, local knowledge, and price transparency. DriveSQ excels at all three. Our {pc} instructors are DVSA-certified, our lessons follow actual {tc} test routes, and our pricing — £35/hr for manual or automatic — has no surprises.',
]

# Unique challenges paragraph templates — 12 variants
CHALLENGES_TEMPLATES = [
    'Driving through {area} throws up situations that a generic lesson plan cannot anticipate. {challenge1_cap} demands sharp observation and quick decision-making. On {road1}, traffic rhythms shift throughout the day — morning commutes, school runs, and evening rush each bring different hazards. DriveSQ instructors who live and teach in {pc} prepare you for every one of these scenarios.',
    'Every neighbourhood has its driving quirks, and {area} is no exception. {challenge2_cap} catches out newcomers regularly. The flow on {road1} varies hugely between peak and off-peak hours, and {road2} introduces its own set of junctions that require local familiarity. DriveSQ builds that familiarity into every {pc} lesson.',
    '{area} roads test patience and precision in equal measure. {challenge1_cap} is a daily reality here, while {challenge2_cap} adds another layer of complexity. DriveSQ lessons in {pc} tackle these exact conditions head-on rather than training on quiet back roads that bear no resemblance to your actual driving environment.',
    'Navigating {area} confidently means understanding its specific road layout and traffic patterns. {road1} carries heavy volumes at peak times, and {challenge1} creates obstacles that textbook driving cannot fully prepare you for. DriveSQ addresses this through structured exposure — controlled, progressive, instructor-guided.',
    'The streets of {area} reward drivers who plan ahead and punish those who react late. {challenge1_cap} is the most common hazard our {pc} learners encounter. On {road2}, speed and traffic density fluctuate unpredictably. DriveSQ trains you to read these changes early and respond calmly.',
    'What makes driving in {area} distinct from neighbouring postcodes? {challenge1_cap} tops the list, followed closely by the complexity of junctions on {road1}. DriveSQ tailors each {pc} lesson to these realities, ensuring you encounter and master them before test day — not during it.',
    'Local drivers in {area} know to watch for {challenge1} and {challenge2}. Visitors and new drivers do not. DriveSQ bridges that gap by immersing {pc} learners in real traffic from early on — guided by an instructor who knows exactly where the pressure points are on {road1} and {road2}.',
    '{road1} in {area} is where many learners first encounter genuinely challenging traffic. {challenge1_cap} is commonplace, and the junction layout on {road2} requires confident lane discipline. DriveSQ introduces these roads gradually, starting with quieter hours and building towards peak-time driving as your skills improve.',
    'Traffic in {area} behaves differently to much of Greater Manchester. {challenge2_cap} creates situations you simply will not practise elsewhere. DriveSQ designs {pc} lessons around these local conditions because we believe your training should match your real driving life — not a sanitised version of it.',
    'Confident driving in {pc} means handling {challenge1} without hesitation and navigating {road1} during its busiest periods. DriveSQ achieves this through targeted repetition — revisiting the same junctions and hazards under varying conditions until your response becomes instinctive rather than anxious.',
    'The combination of {challenge1} and {challenge2} makes {area} a demanding but rewarding place to learn. Mastering these roads at {pc} means everywhere else feels straightforward by comparison. DriveSQ leans into this difficulty — it produces better, safer drivers.',
    '{area} sits at a crossroads of traffic from multiple directions, making {road1} and {road2} busier than comparable roads elsewhere. {challenge1_cap} is a constant factor. DriveSQ instructors use this complexity as a training advantage — every {pc} lesson develops real-world skills that transfer to any road in the country.',
]

# FAQ templates — 10 question types, each with 3 answer variants
FAQ_POOL = [
    [
        ('{area} driving lesson prices', 'How much do driving lessons cost in {area}?',
         'DriveSQ lessons across {area} ({pc}) are £35 per hour — manual or automatic, same price. A 10-hour block saves you £20 at £330 total. Our PassFirst package includes complimentary support lessons if you do not pass on your first attempt.'),
        ('{area} driving lesson prices', 'What is the hourly rate for driving lessons in {pc}?',
         'Every DriveSQ lesson in {pc} costs £35 per hour. There is no surcharge for automatic transmission. Bulk bookings of 10 hours cost £330, giving you a £20 saving. We also offer intensive course pricing for learners wanting to pass within one to two weeks.'),
        ('{area} driving lesson prices', 'Are DriveSQ lessons in {area} expensive?',
         'At £35 per hour for both manual and automatic, DriveSQ is competitively priced for {area}. Most local schools charge £36-£40 for manual and even more for automatic. We keep costs transparent — no booking fees, no cancellation charges with 48 hours notice.'),
    ],
    [
        ('nearest test centre', 'Where is the closest test centre to {pc}?',
         'The nearest practical test centre to {area} is {tc}. DriveSQ lessons incorporate regular practice on the roads and junctions that examiners at {tc} use most frequently.'),
        ('nearest test centre', 'Which test centre covers the {pc} area?',
         '{tc} Test Centre handles driving tests for {area} residents. DriveSQ instructors drive {tc} routes every week, so our {pc} learners arrive on test day already familiar with every road the examiner is likely to choose.'),
        ('nearest test centre', 'Where will I take my driving test if I live in {area}?',
         'Your practical driving test will most likely be at {tc} Test Centre. DriveSQ structures {area} lessons to include the actual roads and roundabouts used on {tc} test routes, giving you a significant familiarity advantage.'),
    ],
    [
        ('automatic lessons', 'Do you offer automatic driving lessons in {area}?',
         'Yes. DriveSQ provides automatic and manual lessons throughout {area} ({pc}) at the same £35 per hour rate. No automatic surcharge. Approximately 40% of our {pc} learners choose automatic, and that proportion grows every year.'),
        ('automatic lessons', 'Can I learn in an automatic car in {pc}?',
         'Absolutely. DriveSQ offers automatic tuition across the entire {pc} area at £35 per hour — the same price as manual. Many {area} learners prefer automatic for the simpler clutch-free experience, especially in heavy traffic on {road1}.'),
        ('automatic lessons', 'Is automatic more expensive than manual at DriveSQ in {area}?',
         'No. DriveSQ charges £35 per hour for both automatic and manual lessons in {area}. Most competing schools add a £2-£5 premium for automatic. We believe transmission choice should not carry a price penalty.'),
    ],
    [
        ('lesson count', 'How many lessons will I need in {area}?',
         'The DVSA national average is 45 hours of professional tuition. In {area}, our learners typically require 35 to 50 hours depending on prior experience, confidence level, and the complexity of {pc} roads. DriveSQ tracks your progress so you always know where you stand.'),
        ('lesson count', 'How many hours of driving lessons do most {pc} learners need?',
         'Most DriveSQ learners in {area} pass after 38 to 48 hours of professional lessons. Complete beginners tend towards the higher end; those with some experience or private practice often need fewer. We give you an honest estimate after your first assessment lesson.'),
        ('lesson count', 'How long does it take to learn to drive in {area}?',
         'With weekly two-hour lessons, most {area} learners reach test standard in five to seven months. Intensive courses can compress this to one to three weeks. DriveSQ assesses your starting ability on {pc} roads and provides a personalised timeline from lesson one.'),
    ],
    [
        ('pickup', 'Can you collect me from home in {pc}?',
         'DriveSQ provides door-to-door collection across all of {pc}, including {towns_str}. We also pick up from workplaces, colleges, and train stations within the {area} area.'),
        ('pickup', 'Do you pick up from anywhere in {area}?',
         'Yes. DriveSQ collects learners from any address in the {pc} postcode area — home, work, university, or any other convenient location across {towns_str}. Just share your preferred pickup point when booking.'),
        ('pickup', 'Where exactly in {pc} do you cover?',
         'Every street in {pc}. DriveSQ covers {towns_str} and everywhere in between. Your instructor collects you from your door and returns you afterwards. No walking to a meeting point — your lesson starts the moment you get in the car.'),
    ],
    [
        ('intensive courses', 'Do you offer intensive driving courses in {area}?',
         'DriveSQ runs intensive and semi-intensive courses across {area}. Options range from one-week crash courses (30+ hours) to two-week programmes with daily three-hour sessions. All include mock tests on {tc} routes and a pre-booked practical test date.'),
        ('intensive courses', 'Can I pass my test quickly in {pc}?',
         'Yes. DriveSQ offers intensive courses in {area} designed to get you test-ready within one to three weeks. These include daily lessons, mock tests from {tc}, and a pre-booked test date. They suit learners who can dedicate full days to training.'),
        ('intensive courses', 'What intensive course options are available in {area}?',
         'DriveSQ offers 20-hour, 30-hour, and 40-hour intensive packages in {area}. Each includes daily lessons across {pc} roads, at least two mock examinations from {tc} Test Centre, and flexible scheduling to fit around your commitments.'),
    ],
    [
        ('instructor quality', 'Are DriveSQ instructors in {area} qualified?',
         'Every DriveSQ instructor in {area} holds a DVSA Approved Driving Instructor (ADI) certificate — the highest grade. Our {pc} instructors undergo annual continuing professional development and are CRB/DBS checked. You are learning from fully qualified, vetted professionals.'),
        ('instructor quality', 'Will I get the same instructor every lesson in {pc}?',
         'Yes. DriveSQ assigns you one dedicated instructor for your entire training in {area}. Consistency accelerates learning because your instructor tracks your progress, knows your strengths, and understands your specific anxieties — no repeating yourself to a new face each week.'),
        ('instructor quality', 'How experienced are DriveSQ instructors in {area}?',
         'Our {pc} instructors average over eight years of teaching experience in {area}. They hold DVSA ADI certification, complete annual CPD training, and specialise in the {tc} Test Centre routes. Several have pass rates above 80% — well above the national average of 48%.'),
    ],
    [
        ('test pass rate', 'What is the pass rate for DriveSQ in {area}?',
         'DriveSQ maintains a first-time pass rate significantly above the national average of 48%. In {area}, our combination of local road knowledge, structured mock tests from {tc}, and data-driven progress tracking means learners arrive on test day genuinely prepared, not just hopeful.'),
        ('test pass rate', 'How many {pc} learners pass first time with DriveSQ?',
         'A strong majority of our {area} learners pass first time. We attribute this to three factors: lessons on actual {tc} test routes, rigorous mock examinations, and honest assessment of test readiness. We will not recommend you book until your skills consistently reach test standard.'),
    ],
    [
        ('cancellation policy', 'What is your cancellation policy in {area}?',
         'DriveSQ requires 48 hours notice to cancel or reschedule a lesson in {area} without charge. Cancellations with less than 48 hours notice incur the full lesson fee. This policy ensures instructor availability for all {pc} learners and discourages last-minute drop-outs.'),
        ('cancellation policy', 'Can I reschedule a driving lesson in {pc}?',
         'Yes. DriveSQ allows free rescheduling of {area} lessons with 48 or more hours notice. Simply message your instructor on WhatsApp or call 07352 932003. We understand schedules change — flexibility is built into our booking system.'),
    ],
    [
        ('payment methods', 'How do I pay for lessons in {area}?',
         'DriveSQ accepts cash, bank transfer, and online payment for {area} lessons. Block bookings can be paid in instalments. We issue receipts for every transaction — useful if your employer or parents are funding your {pc} driving tuition.'),
        ('payment methods', 'Can I pay for driving lessons weekly in {pc}?',
         'Yes. DriveSQ offers pay-as-you-go lessons at £35 per session, or block bookings of 10 hours at £330. There is no obligation to commit upfront — many {area} learners start with single lessons and move to blocks once they are happy with their instructor.'),
    ],
]

# Unique offers section variants
OFFERS_VARIANTS = [
    '''<div style="background:linear-gradient(135deg,#D10A11,#ff4444);border-radius:16px;padding:28px;color:#fff;margin:28px 0">
<h3 style="color:#fff;font-family:'Oswald',sans-serif;font-size:1.3rem;margin-bottom:10px">Current DriveSQ Offers for {area}</h3>
<ul style="list-style:none;padding:0">
<li style="margin:8px 0"><strong>£35/hr</strong> — manual or automatic, identical price</li>
<li style="margin:8px 0"><strong>10-hour block: £330</strong> (save £20 vs pay-as-you-go)</li>
<li style="margin:8px 0"><strong>PassFirst guarantee</strong> — complimentary support lessons if you fail</li>
<li style="margin:8px 0"><strong>Intensive courses</strong> — pass in 1-2 weeks</li>
<li style="margin:8px 0"><strong>Same instructor</strong> every single lesson</li>
</ul></div>''',
    '''<div style="background:linear-gradient(135deg,#D10A11,#ff4444);border-radius:16px;padding:28px;color:#fff;margin:28px 0">
<h3 style="color:#fff;font-family:'Oswald',sans-serif;font-size:1.3rem;margin-bottom:10px">{area} Lesson Packages</h3>
<ul style="list-style:none;padding:0">
<li style="margin:8px 0"><strong>Single lesson:</strong> £35 per hour (manual or automatic)</li>
<li style="margin:8px 0"><strong>Starter pack:</strong> 5 hours for £170 (save £5)</li>
<li style="margin:8px 0"><strong>Standard block:</strong> 10 hours for £330 (save £20)</li>
<li style="margin:8px 0"><strong>Intensive:</strong> 20+ hours from £640, test date included</li>
<li style="margin:8px 0"><strong>PassFirst:</strong> free extra lessons if your first test is unsuccessful</li>
</ul></div>''',
    '''<div style="background:linear-gradient(135deg,#D10A11,#ff4444);border-radius:16px;padding:28px;color:#fff;margin:28px 0">
<h3 style="color:#fff;font-family:'Oswald',sans-serif;font-size:1.3rem;margin-bottom:10px">Why {area} Learners Choose DriveSQ</h3>
<ul style="list-style:none;padding:0">
<li style="margin:8px 0"><strong>Transparent pricing:</strong> £35/hr, no hidden fees, auto = manual price</li>
<li style="margin:8px 0"><strong>Bulk discount:</strong> 10 hours at £330 saves you £20</li>
<li style="margin:8px 0"><strong>PassFirst protection:</strong> additional support at no extra charge after a failed test</li>
<li style="margin:8px 0"><strong>Fast-track option:</strong> intensive courses with daily lessons</li>
<li style="margin:8px 0"><strong>Consistency:</strong> one instructor throughout your entire training</li>
</ul></div>''',
    '''<div style="background:linear-gradient(135deg,#D10A11,#ff4444);border-radius:16px;padding:28px;color:#fff;margin:28px 0">
<h3 style="color:#fff;font-family:'Oswald',sans-serif;font-size:1.3rem;margin-bottom:10px">DriveSQ {area} Price List</h3>
<ul style="list-style:none;padding:0">
<li style="margin:8px 0">Hourly rate: <strong>£35</strong> (automatic and manual — same price)</li>
<li style="margin:8px 0">10-lesson block: <strong>£330</strong> (£3.50 per hour saving)</li>
<li style="margin:8px 0">Assessment lesson: <strong>£35</strong> (first lesson, no commitment)</li>
<li style="margin:8px 0">Mock test session: <strong>included</strong> in lesson hours</li>
<li style="margin:8px 0">PassFirst guarantee: <strong>included</strong> at no extra cost</li>
</ul></div>''',
]

# CTA section variants
CTA_VARIANTS = [
    ('<h2>Start Driving in {area} Today</h2>', '<p>DVSA-approved lessons from £35/hr. WhatsApp us now for instant booking.</p>'),
    ('<h2>Ready to Learn in {area}?</h2>', '<p>Book your first lesson in {pc} — £35/hr, manual or automatic. Reply within minutes.</p>'),
    ('<h2>Book Your {area} Lesson Now</h2>', '<p>DriveSQ covers all of {pc}. Message us on WhatsApp for same-day availability.</p>'),
    ('<h2>Your {area} Driving Journey Starts Here</h2>', '<p>DVSA-certified instructors, £35/hr, door-to-door collection across {pc}.</p>'),
]

# Section heading variants
LEARN_HEADINGS = [
    'What You Will <span class="accent">Master</span>',
    'Your <span class="accent">Lesson</span> Curriculum',
    'Skills We <span class="accent">Teach</span> in {area}',
    'Inside a <span class="accent">DriveSQ</span> Lesson',
    'Core <span class="accent">Driving</span> Skills',
    'Your <span class="accent">Training</span> Programme',
]

WHY_HEADINGS = [
    'Why Learn to Drive in <span class="accent">{area}</span>?',
    'Driving in <span class="accent">{area}</span> — What to Expect',
    '<span class="accent">{area}</span> Road Conditions',
    'What Makes <span class="accent">{area}</span> Unique for Learners?',
    'The <span class="accent">{area}</span> Driving Challenge',
    'Navigating <span class="accent">{area}</span> with Confidence',
]

ROADS_HEADINGS = [
    '<span class="accent">{area}</span> Roads & Landmarks',
    'Key Routes in <span class="accent">{area}</span>',
    'Your <span class="accent">{area}</span> Driving Map',
    '<span class="accent">{pc}</span> Road Network',
    'Roads You Will Drive in <span class="accent">{area}</span>',
    'Local <span class="accent">{area}</span> Geography',
]

FAQ_HEADINGS = [
    'Frequently Asked <span class="accent">Questions</span>',
    'Common <span class="accent">Questions</span> from {area} Learners',
    '{area} Learners <span class="accent">Ask</span>',
    'Your <span class="accent">Questions</span> Answered',
    '<span class="accent">{pc}</span> Driving FAQs',
    'What {area} Learners <span class="accent">Want to Know</span>',
]

VIDEO_HEADINGS = [
    'Watch DriveSQ <span class="accent">in Action</span>',
    'See How We <span class="accent">Teach</span>',
    'A Real <span class="accent">DriveSQ</span> Lesson',
    'DriveSQ on <span class="accent">Manchester</span> Roads',
    'Inside a <span class="accent">Lesson</span>',
    'Watch and <span class="accent">Learn</span>',
]

VIDEO_CAPTIONS = [
    'A real DriveSQ lesson on Manchester roads — the same structured approach we use in {area}.',
    'Watch how DriveSQ instructors teach in real traffic conditions similar to {area}.',
    'This footage shows a genuine {pc}-area lesson covering junctions, roundabouts, and hazard response.',
    'See DriveSQ\'s teaching method in action — commentary driving through real Greater Manchester traffic.',
    'Every {area} lesson follows this approach: structured, patient, and focused on building genuine skill.',
    'Our {pc} lessons look exactly like this — real roads, real traffic, real progress.',
]

CARD_HEADINGS_MSPSL = [
    'MSPSL & Junctions', 'Junction Technique', 'Mirror-Signal Routine',
    'Approach & Positioning', 'Road Positioning', 'Junction Mastery',
]
CARD_HEADINGS_HAZARD = [
    'Hazard Awareness', 'Reading the Road', 'Spotting Danger',
    'Anticipation Skills', 'Hazard Response', 'Defensive Awareness',
]
CARD_HEADINGS_MANOEUVRE = [
    'Manoeuvres', 'Parking & Reversing', 'Vehicle Control',
    'Low-Speed Skills', 'Precision Driving', 'Test Manoeuvres',
]
CARD_HEADINGS_TEST = [
    'Test Preparation', 'Exam Readiness', 'Mock Tests',
    'Test-Day Confidence', 'Passing Your Test', 'Test Strategy',
]
CARD_ICONS_MSPSL = ['bi-signpost-split', 'bi-sign-turn-right', 'bi-arrow-90deg-right', 'bi-diagram-3']
CARD_ICONS_HAZARD = ['bi-exclamation-triangle', 'bi-eye', 'bi-shield-exclamation', 'bi-binoculars']
CARD_ICONS_MANOEUVRE = ['bi-arrows-move', 'bi-p-square', 'bi-arrow-counterclockwise', 'bi-car-front']
CARD_ICONS_TEST = ['bi-clipboard-check', 'bi-trophy', 'bi-journal-check', 'bi-award']


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
    town_first = data['towns'][0]
    town_last = data['towns'][-1]
    challenge1_cap = data['challenges'][0][0].upper() + data['challenges'][0][1:]
    challenge2_cap = data['challenges'][1][0].upper() + data['challenges'][1][1:] if len(data['challenges'])>1 else challenge1_cap

    fmt = {
        'area':area, 'pc':pc,
        'road1':data['roads'][0],
        'road2':data['roads'][1] if len(data['roads'])>1 else data['roads'][0],
        'landmark':rng.choice(data['landmarks']),
        'challenge1':data['challenges'][0],
        'challenge2':data['challenges'][1] if len(data['challenges'])>1 else data['challenges'][0],
        'challenge1_cap':challenge1_cap,
        'challenge2_cap':challenge2_cap,
        'tc':data['tc'],
        'roads_str':roads_str,
        'towns_str':towns_str,
        'town_first':town_first,
        'town_last':town_last,
    }

    mspsl = rng.choice(MSPSL_SECTIONS).format(**fmt)
    hazard = rng.choice(HAZARD_SECTIONS).format(**fmt)
    manoeuvre = rng.choice(MANOEUVRE_SECTIONS).format(**fmt)
    testprep = rng.choice(TEST_PREP_SECTIONS).format(**fmt)
    intro = rng.choice(INTRO_TEMPLATES).format(**fmt)
    challenges_para = rng.choice(CHALLENGES_TEMPLATES).format(**fmt)
    offers = rng.choice(OFFERS_VARIANTS).format(**fmt)
    cta_h2, cta_p = rng.choice(CTA_VARIANTS)
    cta_h2 = cta_h2.format(**fmt)
    cta_p = cta_p.format(**fmt)

    why_heading = rng.choice(WHY_HEADINGS).format(**fmt)
    learn_heading = rng.choice(LEARN_HEADINGS).format(**fmt)
    roads_heading = rng.choice(ROADS_HEADINGS).format(**fmt)
    faq_heading = rng.choice(FAQ_HEADINGS).format(**fmt)
    vid_heading = rng.choice(VIDEO_HEADINGS)
    vid_caption = rng.choice(VIDEO_CAPTIONS).format(**fmt)

    mspsl_h = rng.choice(CARD_HEADINGS_MSPSL)
    hazard_h = rng.choice(CARD_HEADINGS_HAZARD)
    manoeuvre_h = rng.choice(CARD_HEADINGS_MANOEUVRE)
    test_h = rng.choice(CARD_HEADINGS_TEST)
    mspsl_icon = rng.choice(CARD_ICONS_MSPSL)
    hazard_icon = rng.choice(CARD_ICONS_HAZARD)
    manoeuvre_icon = rng.choice(CARD_ICONS_MANOEUVRE)
    test_icon = rng.choice(CARD_ICONS_TEST)

    img_list = list(IMGS.values())
    rng.shuffle(img_list)
    img1, img2, img3 = img_list[0], img_list[1], img_list[2]

    title = f'Driving Lessons {area} ({pc}) — DVSA-Approved, £35/hr | DriveSQ'
    h1 = f'Driving Lessons in {area} ({pc})'
    desc = f'Professional driving lessons in {area} ({pc}) from £35/hr. DVSA-approved instructors, test-route practice at {data["tc"]} Test Centre, WhatsApp booking. Manual & automatic same price.'

    # Build FAQs — pick from different categories, unique answer variant per page
    faq_categories = list(range(len(FAQ_POOL)))
    rng.shuffle(faq_categories)
    faqs = []
    for cat_idx in faq_categories[:5]:
        variants = FAQ_POOL[cat_idx]
        chosen = rng.choice(variants)
        q = chosen[1].format(**fmt)
        a = chosen[2].format(**fmt)
        faqs.append((q, a))

    faq_schema = json.dumps({"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
        {"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q,a in faqs
    ]})

    local_schema = json.dumps({"@context":"https://schema.org","@type":"DrivingSchool","name":"DriveSQ","url":url,
        "telephone":"+447352932003","logo":LOGO,
        "description":desc,"priceRange":"£35-£36",
        "areaServed":{"@type":"Place","name":f'{area} ({pc})'},
        "address":{"@type":"PostalAddress","addressLocality":area,"postalCode":pc,"addressRegion":"Greater Manchester","addressCountry":"GB"}
    })

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
<h2>{why_heading}</h2>
<div class="img-text">
<div>
<p>{challenges_para}</p>
<div class="tip-box"><strong><i class="bi bi-lightbulb me-1"></i>Local tip:</strong> {data['tip']}</div>
</div>
<div><img src="{img1}" alt="Driving lessons {area}" loading="lazy" width="540" height="360"/></div>
</div>
</div></section>

<section class="sect sect-alt"><div class="container">
<h2>{learn_heading}</h2>
<div class="card-grid">
<div class="dcard"><i class="bi {mspsl_icon}"></i><h3>{mspsl_h}</h3>{mspsl}</div>
<div class="dcard"><i class="bi {hazard_icon}"></i><h3>{hazard_h}</h3>{hazard}</div>
<div class="dcard"><i class="bi {manoeuvre_icon}"></i><h3>{manoeuvre_h}</h3>{manoeuvre}</div>
<div class="dcard"><i class="bi {test_icon}"></i><h3>{test_h}</h3>{testprep}</div>
</div>
</div></section>

<section class="sect"><div class="container">
<h2>{roads_heading}</h2>
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
<h2>{vid_heading}</h2>
<div class="vid-wrap">
<video src="{VIDEO}" controls preload="metadata" poster="{img3}" style="width:100%;display:block" width="800" height="450"></video>
</div>
<p style="color:var(--muted);font-size:.85rem;margin-top:8px">{vid_caption}</p>
</div></section>

<section class="sect"><div class="container">
{offers}
</div></section>

<section class="sect sect-alt"><div class="container">
<h2>{faq_heading}</h2>
{''.join(f'<div class="faq-item"><div class="faq-q">{q}</div><div class="faq-a">{a}</div></div>' for q,a in faqs)}
</div></section>

{'<section class="sect"><div class="container"><h2>Nearby <span class="accent">Areas</span></h2><div>' + nearby_html + '</div></div></section>' if nearby_html else ''}

<section class="cta-band"><div class="container">
{cta_h2}
{cta_p}
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


count = 0
for data in POSTCODES:
    filename, html = build_postcode_page(data)
    with open(filename, 'w') as f:
        f.write(html)
    count += 1
    print(f'{count}. {filename}')

print(f'\nTotal postcode pages generated: {count}')
