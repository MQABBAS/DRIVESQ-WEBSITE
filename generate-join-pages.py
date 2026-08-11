#!/usr/bin/env python3
"""
Generate unique instructor-recruitment landing pages targeting specific
occupations and life situations. Each page has genuinely distinct content —
not a find-and-replace of one variable — because the value proposition of
becoming an ADI differs by audience (a taxi driver's pitch is not a
stay-at-home parent's pitch).
"""
import os, json, html as html_mod, re
os.chdir('/home/user/DRIVESQ-WEBSITE')

LOGO = 'https://i.postimg.cc/sx8zRRKV/cropped-circle-image.png'
PASS_IMG = 'https://i.postimg.cc/pLtNygxL/DRIVE-SQ-PASS.jpg'
WA = 'https://wa.me/447352932003'

AUDIENCES = [
    {
        'slug': 'join-driving-instructor-taxi-drivers',
        'audience': 'Taxi & Private Hire Drivers',
        'badge': 'For Taxi &amp; Private Hire Drivers',
        'h1': 'From Taxi Driver to Driving Instructor',
        'meta_desc': "Taxi and private hire drivers already have the road knowledge to become a top driving instructor. See how your experience transfers, what the ADI process involves, and why DriveSQ is hiring in Manchester.",
        'hero_sub': "You already know every rat-run, roundabout and rush-hour route in Greater Manchester. That knowledge is worth more as a driving instructor than it is behind the wheel of a cab.",
        'intro': "Taxi and private hire driving builds exactly the skills examiners look for in an ADI: hazard perception sharpened by thousands of miles, calm decision-making under pressure, and genuine local road knowledge that takes other candidates years to build. The leap from taxi driver to driving instructor is one of the most natural career changes on this list.",
        'pain_points': [
            "Long, unpredictable shifts — nights, weekends, whatever the app throws at you",
            "Income that swings with fuel prices, platform fees and surge algorithms you don't control",
            "Sitting in traffic earning nothing while the meter (or app) stays quiet",
            "Wear and tear on your own vehicle with little to show for it long-term",
        ],
        'skills': [
            "Advanced hazard awareness from constant exposure to real traffic",
            "Deep local knowledge of Manchester's roads, one-way systems and test routes",
            "Calm, professional manner with nervous or first-time passengers",
            "Comfortable talking and driving at the same time — core to instructing",
        ],
        'quote': "I drove a cab for nine years before qualifying as an ADI. The driving skill was already there — what DriveSQ helped with was turning it into a teaching method pupils could actually follow.",
        'quote_name': 'Former taxi driver, now DriveSQ ADI',
        'faqs': [
            ("Can I train as a PDI while still driving my taxi?", "Yes. Many taxi drivers reduce their shifts gradually while completing ADI Part 2 and Part 3, using taxi income to bridge the gap until their instructor income builds up."),
            ("Does my taxi badge count toward becoming an ADI?", "Your taxi or private hire licence doesn't replace any part of the ADI qualification, but the DBS check, driving experience and customer-facing skills you already have make the process smoother."),
            ("Will my knowledge of Manchester roads actually help?", "Significantly. Much of ADI Part 3 and ongoing teaching is about route planning and hazard commentary — skills taxi drivers already use every single shift."),
            ("How much more could I earn as an instructor than driving a taxi?", "It depends on hours and reputation, but instructors set their own rate per hour rather than splitting fares with a platform, and keep 100% of what they charge at DriveSQ with no franchise fee."),
        ],
        'cta_wa_text': "Hi! I'm a taxi driver interested in training as a DriveSQ driving instructor",
    },
    {
        'slug': 'join-driving-instructor-bus-drivers',
        'audience': 'Bus & Coach Drivers',
        'badge': 'For Bus &amp; Coach Drivers',
        'h1': 'From Bus Driver to Driving Instructor',
        'meta_desc': "Bus and coach drivers already hold advanced driving qualifications and route discipline. Find out how that experience fast-tracks a career as a DVSA driving instructor with DriveSQ in Manchester.",
        'hero_sub': "You already drive to a timetable, manage passengers, and hold yourself to a higher driving standard than most road users. Teaching learners is a natural next step.",
        'intro': "Bus and coach drivers already operate under some of the strictest standards on the road — a Driver CPC, tight timetables, and constant passenger awareness. That discipline translates directly into the structured, patient teaching style DVSA examiners want to see from an ADI in the Part 3 standards check.",
        'pain_points': [
            "Split shifts and early starts that eat into family time",
            "Little control over your route, timetable or working pattern",
            "Physically demanding days spent managing dozens of passengers at once",
            "Depot politics and rigid scheduling with almost no flexibility",
        ],
        'skills': [
            "Held to a professional driving standard well above the average motorist",
            "Route planning and time management from years of timetabled driving",
            "Experience managing passengers calmly, including difficult situations",
            "Comfortable in a large vehicle, which builds strong spatial awareness for smaller cars",
        ],
        'quote': "After eighteen years on the buses, I wanted to actually get to know the people I was driving with instead of forty new faces a day. Instructing gave me that — plus I choose my own hours now.",
        'quote_name': 'Former bus driver, now DriveSQ ADI',
        'faqs': [
            ("Does my Driver CPC help with the ADI qualification?", "The CPC is a separate qualification from the ADI badge, but the professional driving standards and continuous training habit it builds make the ADI theory and practical tests noticeably easier to prepare for."),
            ("Will I have to give up my current job to train?", "Many bus drivers train for their ADI part-time or on days off, then transition once they've passed Part 2 and are working toward Part 3 as a PDI."),
            ("Is teaching in a small car very different from driving a bus?", "The driving itself is simpler in a car, but observation and hazard-awareness habits from bus driving transfer directly and give you a head start over most trainees."),
            ("Can I choose my own working hours as a DriveSQ instructor?", "Yes — that's one of the biggest draws for former bus and coach drivers. You set your own diary, days and areas rather than working to someone else's timetable."),
        ],
        'cta_wa_text': "Hi! I'm a bus/coach driver interested in training as a DriveSQ driving instructor",
    },
    {
        'slug': 'join-driving-instructor-hgv-drivers',
        'audience': 'HGV & Lorry Drivers',
        'badge': 'For HGV &amp; Lorry Drivers',
        'h1': 'From HGV Driver to Driving Instructor',
        'meta_desc': "HGV and lorry drivers bring advanced vehicle control and motorway confidence to the ADI qualification. See why experienced LGV drivers make excellent driving instructors with DriveSQ Manchester.",
        'hero_sub': "You've handled 44 tonnes down motorways and through tight yards. A hatchback with a learner behind the wheel is a different kind of challenge — one that gets you home every night.",
        'intro': "HGV and LGV drivers are trained to an exceptionally high standard of vehicle control, load awareness and motorway discipline. That grounding, combined with the maturity that comes from years of professional driving, is exactly what DVSA examiners want to see when assessing a prospective ADI's Part 2 driving test.",
        'pain_points': [
            "Nights away from home and long-haul routes that disrupt family life",
            "Increasing pressure from delivery deadlines and traffic congestion",
            "Physically and mentally tiring long shifts behind the wheel",
            "Limited home time compared to a local, daily-return job",
        ],
        'skills': [
            "Exceptional vehicle control and spatial awareness, built over years of large-vehicle driving",
            "Motorway and dual-carriageway confidence that many learners find intimidating",
            "Strong hazard perception from constant exposure to varied road conditions",
            "A calm, methodical approach that suits nervous and anxious learners well",
        ],
        'quote': "Fifteen years of long-haul and I barely saw my kids grow up. Now I'm home every evening, teaching people I actually get to know, and I'm still doing what I'm good at — driving.",
        'quote_name': 'Former HGV driver, now DriveSQ ADI',
        'faqs': [
            ("Do I need a car licence as well as my HGV licence?", "Yes, the ADI qualification is based on a standard car driving test, so you'll need a full car (category B) licence held for at least three years, in addition to any LGV categories you hold."),
            ("Will my HGV experience make Part 2 easier?", "Most HGV drivers find the ADI Part 2 practical test straightforward, since it demands a lower level of vehicle control than the standard held for HGV categories."),
            ("Can I finally get a job with regular home hours?", "Yes — this is one of the main reasons long-haul and LGV drivers move into instructing. You work locally, choose your hours, and are home every single day."),
            ("Is there demand for driving instructors right now in Manchester?", "Yes. DriveSQ has more pupil enquiries across Greater Manchester than current instructor capacity, particularly for manual and automatic lessons in Stockport, Sale and South Manchester."),
        ],
        'cta_wa_text': "Hi! I'm an HGV/lorry driver interested in training as a DriveSQ driving instructor",
    },
    {
        'slug': 'join-driving-instructor-delivery-drivers',
        'audience': 'Delivery & Courier Drivers',
        'badge': 'For Delivery &amp; Courier Drivers',
        'h1': 'From Delivery Driver to Driving Instructor',
        'meta_desc': "Delivery and courier drivers already spend all day behind the wheel under pressure. Discover how that experience converts into a stable, better-paid career as a driving instructor with DriveSQ.",
        'hero_sub': "You already spend your whole day driving, navigating and hitting targets. Do the same driving — for better pay, on your own schedule, without a delivery app deciding your route.",
        'intro': "Delivery and courier work puts drivers through an intense apprenticeship in navigation, time pressure and multi-drop route planning. It's also often underpaid relative to the mileage and stress involved. Driving instruction offers the same core skill — being good behind the wheel — with far more control over your income and hours.",
        'pain_points': [
            "Piece-rate or per-drop pay that punishes traffic, weather and parking delays outside your control",
            "Constant pressure from delivery apps tracking every minute",
            "Wear and tear on your own vehicle with fuel and maintenance eating into pay",
            "No sick pay, holiday pay or route choice as a gig-platform driver",
        ],
        'skills': [
            "Exceptional route knowledge and navigation built from hundreds of drops a week",
            "Comfortable driving for long hours without losing concentration",
            "Strong time-management and planning skills",
            "Experience adapting to changing traffic and road conditions in real time",
        ],
        'quote': "I was doing twelve-hour days for a delivery app and taking home less than I expected after fuel. Instructing pays better per hour, and nobody's tracking my location every ninety seconds.",
        'quote_name': 'Former courier driver, now DriveSQ PDI',
        'faqs': [
            ("Can I keep doing delivery work while I train?", "Yes, many delivery drivers train for their ADI around existing shifts, since the theory and practical tests can be scheduled flexibly and Part 3 training happens on your own timetable."),
            ("Is instructing more reliable income than gig delivery work?", "Once qualified and building a pupil base, most instructors find their income more predictable than piece-rate delivery work, since lesson bookings are scheduled in advance rather than dependent on app demand."),
            ("Do I need my own car to train as an instructor?", "You'll need a suitable dual-control vehicle to teach in once qualified, which DriveSQ can advise on — many new instructors lease a dual-control car rather than buying outright."),
            ("What's the biggest adjustment moving from delivery driving to teaching?", "The driving itself is easy for most delivery drivers — the adjustment is developing the coaching and communication side, which is exactly what ADI Part 3 training focuses on."),
        ],
        'cta_wa_text': "Hi! I'm a delivery/courier driver interested in training as a DriveSQ driving instructor",
    },
    {
        'slug': 'join-driving-instructor-gig-economy-drivers',
        'audience': 'Uber, Bolt & Gig Economy Drivers',
        'badge': 'For Uber, Bolt &amp; Gig Drivers',
        'h1': 'From Rideshare Driver to Driving Instructor',
        'meta_desc': "Uber, Bolt and other rideshare drivers already have the road hours and passenger experience to become a driving instructor. See how DriveSQ helps gig drivers build a more stable career.",
        'hero_sub': "You've already logged thousands of miles and hundreds of passengers. Turn that experience into a career where you set the rate, not an app.",
        'intro': "Rideshare driving gives you constant exposure to real traffic, difficult passengers, and unpredictable situations — exactly the kind of resilience DVSA examiners look for. The frustration most rideshare drivers share is the same: an algorithm sets your price, your area, and takes its cut. Instructing hands that control back to you.",
        'pain_points': [
            "Platform commission cutting deep into every fare",
            "Surge pricing and demand algorithms you have no visibility into",
            "Rating systems that can affect your access to work overnight",
            "No say over which pickups or areas you're sent to",
        ],
        'skills': [
            "High passenger-management skills from managing nervous or difficult riders",
            "Sharp local road knowledge across a wide area",
            "Comfortable driving for extended hours across varied traffic conditions",
            "Used to working independently and managing your own schedule",
        ],
        'quote': "The app decided my price, my area, even my rating. As an instructor, pupils choose me because of how I teach, not an algorithm — that alone was worth the switch.",
        'quote_name': 'Former rideshare driver, now DriveSQ ADI',
        'faqs': [
            ("Can I train as an instructor while still driving for Uber or Bolt?", "Yes, most rideshare drivers reduce their platform hours gradually while completing ADI training rather than stopping outright, since you control your own schedule on both sides."),
            ("Is the pay better than rideshare driving?", "Instructors keep what they charge per lesson with no per-ride commission taken by a platform, which most former rideshare drivers find far more predictable and rewarding per hour worked."),
            ("Do I need a special PCO-style licence to be a driving instructor?", "No — the ADI qualification is entirely separate from private hire licensing. You'll need a standard car licence held for 3+ years, not a PCO/private hire badge."),
            ("What's the biggest difference day-to-day?", "You go from an app choosing your next passenger to building an actual client base of pupils who book you specifically and often refer friends and family."),
        ],
        'cta_wa_text': "Hi! I'm a rideshare driver interested in training as a DriveSQ driving instructor",
    },
    {
        'slug': 'join-driving-instructor-warehouse-workers',
        'audience': 'Warehouse & Forklift Workers',
        'badge': 'For Warehouse &amp; Forklift Workers',
        'h1': 'From Warehouse Worker to Driving Instructor',
        'meta_desc': "Warehouse and forklift operatives already have vehicle-handling discipline and physical stamina. Discover why DriveSQ Manchester welcomes warehouse workers into ADI training.",
        'hero_sub': "You've spent years operating machinery safely under pressure in a warehouse. That same discipline — and a driving licence — is most of what you need to start ADI training.",
        'intro': "Warehouse and forklift work builds real operational discipline: safety checks, precise vehicle control in tight spaces, and working to strict procedures. Instructors need the same mindset behind a different kind of wheel. If shift patterns and repetitive strain are wearing you down, driving instruction offers a complete change of scenery without starting your career from zero.",
        'pain_points': [
            "Repetitive physical strain from years of manual handling and machine operation",
            "Rotating shifts that disrupt sleep and family routines",
            "Little progression beyond team leader roles without a total career change",
            "Indoor, repetitive days with minimal variety or human interaction",
        ],
        'skills': [
            "Precise vehicle control from forklift or plant machinery operation",
            "Strict adherence to safety procedures and checks",
            "Comfortable working to schedules and targets",
            "Physical stamina for long, active working days",
        ],
        'quote': "Fourteen years on the warehouse floor, mostly nights. Becoming an instructor meant learning a whole new skill — teaching — but the vehicle control side was already second nature from years on the forklift.",
        'quote_name': 'Former warehouse operative, now DriveSQ ADI',
        'faqs': [
            ("Does forklift experience actually count for anything as an ADI?", "It doesn't replace any part of the qualification, but the safety-first mindset and precise vehicle control habits from forklift work genuinely help with the ADI Part 2 practical test."),
            ("Can I train part-time around warehouse shifts?", "Yes, many candidates fit ADI theory study and practical training around existing shift patterns before qualifying and transitioning fully."),
            ("Is the pay better than warehouse work?", "It depends on hours built up, but instructors are not paid an hourly wage capped by an employer — your income scales with the pupils you teach."),
            ("What's the biggest learning curve coming from a warehouse role?", "For most warehouse workers it's less about driving ability and more about developing the coaching and communication skills covered in ADI Part 3 training."),
        ],
        'cta_wa_text': "Hi! I work in a warehouse and I'm interested in training as a DriveSQ driving instructor",
    },
    {
        'slug': 'join-driving-instructor-retail-workers',
        'audience': 'Retail & Supermarket Workers',
        'badge': 'For Retail &amp; Supermarket Workers',
        'h1': 'From Retail Worker to Driving Instructor',
        'meta_desc': "Retail and supermarket staff already have strong customer service skills. See how that experience transfers into a rewarding, flexible career as an ADI with DriveSQ Manchester.",
        'hero_sub': "You already know how to stay patient with people on a bad day and explain things clearly. That's most of what makes a great driving instructor.",
        'intro': "Retail work builds exactly the interpersonal skills that separate a good driving instructor from a mediocre one: patience, clear communication, and staying calm when someone is stressed or frustrated. Combined with a genuine interest in driving, it's a stronger foundation for instructing than people often realise.",
        'pain_points': [
            "Zero-hours or unpredictable rotas that make planning your life difficult",
            "Low hourly pay despite demanding, people-facing work",
            "Weekend and evening shifts that eat into personal time",
            "Limited progression without moving into management",
        ],
        'skills': [
            "Strong customer service and communication skills",
            "Patience built from dealing with the public daily",
            "Comfortable explaining processes clearly to people learning something new",
            "Reliability and punctuality from shift-based retail work",
        ],
        'quote': "Retail taught me patience I didn't know I had. Turns out that's exactly what a nervous 17-year-old needs from their driving instructor.",
        'quote_name': 'Former retail assistant, now DriveSQ PDI',
        'faqs': [
            ("I've never taught anything before — is that a problem?", "No. ADI Part 3 training teaches you structured coaching methods from scratch; customer-facing retail experience is a genuinely strong starting point for this."),
            ("Can I train while still working my retail job?", "Yes, most trainees keep their current job through the theory and practical driving stages, transitioning once they're working toward Part 3 as a PDI."),
            ("Do I need to have been driving for years to qualify?", "You need to have held a full licence for at least three years, but confident, safe driving matters more than raw years — many successful ADIs qualify at the minimum experience level."),
            ("Is instructing less stressful than retail?", "Most former retail workers find it far less stressful — no rotas dictated by head office, no difficult returns queue, and a one-to-one working relationship with each pupil."),
        ],
        'cta_wa_text': "Hi! I work in retail and I'm interested in training as a DriveSQ driving instructor",
    },
    {
        'slug': 'join-driving-instructor-hospitality-staff',
        'audience': 'Hospitality & Catering Staff',
        'badge': 'For Hospitality &amp; Catering Staff',
        'h1': 'From Hospitality Worker to Driving Instructor',
        'meta_desc': "Chefs, bar and restaurant staff already have the people skills and composure under pressure to make excellent driving instructors. Find out how DriveSQ can help you make the switch.",
        'hero_sub': "You've kept your cool through a slammed Saturday night service. A nervous learner stalling at a junction will not faze you.",
        'intro': "Hospitality staff — chefs, servers, bar and front-of-house teams — build composure under real pressure and constant people skills that transfer directly into teaching. The industry's punishing hours are the number one reason hospitality workers look elsewhere, and driving instruction offers structure and better work-life balance without abandoning the people-focused work you're good at.",
        'pain_points': [
            "Late nights, weekend and holiday shifts that clash with family and social life",
            "High-pressure environments with little downtime during service",
            "Physically demanding work on your feet for entire shifts",
            "Inconsistent income from tips and variable shift allocation",
        ],
        'skills': [
            "Genuine composure under pressure from busy service periods",
            "Strong people skills built from constant customer interaction",
            "Multi-tasking and quick decision-making under time pressure",
            "Reliability and a strong work ethic from shift-based roles",
        ],
        'quote': "Fifteen years in kitchens taught me how to stay calm when everything's going wrong at once. That's basically what Fridays with a nervous learner feel like — except nobody's shouting at me from the pass.",
        'quote_name': 'Former chef, now DriveSQ ADI',
        'faqs': [
            ("Will instructing give me better hours than hospitality?", "Most former hospitality workers find instructing far more predictable — you set your own diary rather than working to a rota dictated by service demand."),
            ("Can I train for my ADI around restaurant shifts?", "Yes, many hospitality workers train around existing shift patterns before transitioning fully once qualified."),
            ("Do I need any teaching background?", "No. ADI Part 3 training builds structured coaching skills from the ground up — your existing people skills from hospitality are a strong head start."),
            ("Is there a demand for instructors right now in Manchester?", "Yes, DriveSQ currently has more pupil enquiries across Greater Manchester than instructor capacity, especially for evening and weekend lesson slots."),
        ],
        'cta_wa_text': "Hi! I work in hospitality and I'm interested in training as a DriveSQ driving instructor",
    },
    {
        'slug': 'join-driving-instructor-factory-workers',
        'audience': 'Factory & Production Workers',
        'badge': 'For Factory &amp; Production Workers',
        'h1': 'From Factory Worker to Driving Instructor',
        'meta_desc': "Factory and production line workers already have the discipline and reliability to succeed as a driving instructor. See why DriveSQ Manchester is actively recruiting from manufacturing roles.",
        'hero_sub': "Repetitive shifts, little control over your hours, and a ceiling on what the role can pay you. Instructing offers a genuine way out — using skills you already have.",
        'intro': "Factory and production work builds discipline, punctuality and the ability to follow precise processes — all useful traits for an ADI candidate. What it rarely offers is variety, autonomy or a say in your own schedule. Driving instruction flips that: no two lessons are the same, and you decide your working pattern.",
        'pain_points': [
            "Repetitive, physically tiring shift work with fixed rotas",
            "Limited earning ceiling regardless of experience or reliability",
            "Little variety day to day",
            "Minimal control over shift patterns or time off",
        ],
        'skills': [
            "Strong discipline and reliability from process-driven work",
            "Comfortable following structured procedures — a direct match for DVSA teaching standards",
            "Physical stamina for full working days",
            "Used to working independently within a set framework",
        ],
        'quote': "Twelve years on the line. Same shift pattern, same tasks, every week. Now every lesson is different, and I'm the one deciding when I work.",
        'quote_name': 'Former production operative, now DriveSQ ADI',
        'faqs': [
            ("Is switching from factory work to instructing a big leap?", "It's a bigger change of pace than some of the other transitions, but the discipline and process-following habits from factory work genuinely help candidates get through ADI training efficiently."),
            ("Can I train while still working full-time?", "Yes, many trainees keep their factory job through theory and Part 2 training, reducing hours only once they're actively building a pupil base as a PDI."),
            ("What does the earning potential actually look like?", "Instructor income is not capped by an employer's pay scale — it scales with the hours you choose to teach and the reputation you build."),
            ("Do I need any experience with teaching or coaching?", "No — ADI Part 3 training teaches structured coaching methods from scratch, and DriveSQ supports new PDIs with guidance as they build experience."),
        ],
        'cta_wa_text': "Hi! I work in a factory and I'm interested in training as a DriveSQ driving instructor",
    },
    {
        'slug': 'join-driving-instructor-security-guards',
        'audience': 'Security Guards & Door Staff',
        'badge': 'For Security Guards &amp; Door Staff',
        'h1': 'From Security Guard to Driving Instructor',
        'meta_desc': "Security guards and door staff already have the calm authority and vigilance to make excellent driving instructors. Discover the ADI path with DriveSQ Manchester.",
        'hero_sub': "You already stay alert for hours and handle difficult situations calmly. Teaching someone to drive rewards exactly that temperament.",
        'intro': "Security work demands constant vigilance, calm authority, and the ability to de-escalate tense situations — skills that map surprisingly well onto teaching a nervous learner driver. If long, unsociable shifts standing on your feet are wearing thin, instruction offers a seated, varied, better-paid alternative that still uses your people skills.",
        'pain_points': [
            "Long night shifts and unsociable hours standing in all weather",
            "Physically and mentally demanding vigilance for entire shifts",
            "Confrontational situations that take a toll over time",
            "Pay that rarely reflects the responsibility involved",
        ],
        'skills': [
            "Strong situational awareness and vigilance",
            "Calm, authoritative manner that reassures nervous learners",
            "Experience de-escalating stressful situations",
            "Reliability and professionalism under pressure",
        ],
        'quote': "Ten years of night shifts on the door. Now I work days, I'm never on my feet in the rain, and I still get to use the calm-under-pressure side of the job I was actually good at.",
        'quote_name': 'Former security officer, now DriveSQ ADI',
        'faqs': [
            ("Does a security background help with ADI training?", "The calm, authoritative communication style security work builds is a genuine asset in ADI Part 3, where examiners assess how well you manage a pupil under mild stress."),
            ("Will I need a fresh DBS check even though I already hold an SIA licence?", "Yes, the ADI process requires its own enhanced DBS check regardless of any existing SIA licence, since you'll be working closely with the public including minors."),
            ("Can I train part-time around security shifts?", "Yes, many candidates reduce shift hours gradually through ADI training rather than leaving their job immediately."),
            ("Is instructing physically easier than security work?", "Most former security staff find it significantly less physically demanding — you're seated, indoors, and working structured daytime hours rather than standing through the night."),
        ],
        'cta_wa_text': "Hi! I work in security and I'm interested in training as a DriveSQ driving instructor",
    },
    {
        'slug': 'join-driving-instructor-postal-workers',
        'audience': 'Postal & Delivery Round Workers',
        'badge': 'For Postal &amp; Delivery Workers',
        'h1': 'From Postal Worker to Driving Instructor',
        'meta_desc': "Postal and delivery round workers already know Manchester's streets better than most. See how that local knowledge converts into a career as a DriveSQ driving instructor.",
        'hero_sub': "You already know which street has the tight turning circle and which junction backs up at 8am. That local knowledge is instantly valuable to a learner driver.",
        'intro': "Years spent on a delivery round build an almost encyclopaedic knowledge of local roads, parking restrictions and traffic patterns — the exact local expertise learners pay for. Combined with a driving instructor's flexible schedule, it's a natural next step for anyone who already knows their patch better than a sat-nav does.",
        'pain_points': [
            "Physically demanding rounds in all weather conditions",
            "Early starts and rigid schedules with little flexibility",
            "Repetitive strain from years of driving and lifting",
            "Limited pay progression within a fixed role",
        ],
        'skills': [
            "Exceptional local road and area knowledge",
            "Comfortable navigating without relying on satnav",
            "Reliable, punctual, used to structured daily routes",
            "Experience driving safely in all weather and traffic conditions",
        ],
        'quote': "Eleven years on a postal round means I know every street in my patch better than I know my own house. Turns out that's exactly what makes a good local driving instructor.",
        'quote_name': 'Former postal worker, now DriveSQ ADI',
        'faqs': [
            ("Does local knowledge really matter for instructing?", "Yes — pupils benefit enormously from an instructor who knows the actual test routes, road layouts and known hazard spots in their local test centre area."),
            ("Can I train around an existing delivery job?", "Yes, many candidates train for the ADI qualification around existing work, transitioning fully once qualified."),
            ("Will the driving test itself be difficult after years of round driving?", "Most postal and delivery workers already drive to a high, careful standard, which puts them in a strong position for the ADI Part 2 practical test."),
            ("Is instructor pay better than a delivery round?", "It varies, but instructors are not paid a fixed hourly wage capped by an employer — income scales with hours taught and pupil demand."),
        ],
        'cta_wa_text': "Hi! I work on a postal/delivery round and I'm interested in training as a DriveSQ driving instructor",
    },
    {
        'slug': 'join-driving-instructor-call-centre-workers',
        'audience': 'Call Centre & Customer Service Workers',
        'badge': 'For Call Centre &amp; Customer Service Staff',
        'h1': 'From Call Centre Worker to Driving Instructor',
        'meta_desc': "Call centre and customer service staff already have the communication skills to become excellent driving instructors. Discover the ADI path and DriveSQ's flexible instructor model.",
        'hero_sub': "You spend your day explaining things clearly and staying patient with frustrated people. Do the same thing — face to face, in a car, for better pay.",
        'intro': "Call centre and customer service roles are built entirely around clear communication, patience and staying calm when someone is frustrated. It's genuinely strong preparation for the coaching side of driving instruction — the part most career-changers find hardest. What it usually lacks is variety, autonomy and being away from a screen, all of which instructing offers in abundance.",
        'pain_points': [
            "Repetitive desk-based work with tightly monitored call metrics",
            "Little autonomy over your schedule or working pattern",
            "Dealing with frustrated customers with limited ability to actually help",
            "Screen fatigue and minimal physical movement through the day",
        ],
        'skills': [
            "Excellent verbal communication and clear explanation skills",
            "Patience built from managing frustrated or anxious customers",
            "Experience following structured scripts and processes — useful for lesson planning",
            "Strong problem-solving under time pressure",
        ],
        'quote': "I spent six years explaining the same three things to frustrated customers on a headset. Now I explain roundabouts to nervous seventeen-year-olds, and honestly the seventeen-year-olds are more grateful.",
        'quote_name': 'Former customer service advisor, now DriveSQ PDI',
        'faqs': [
            ("I'm not confident behind the wheel with someone watching — is that normal?", "Yes, this is common for career-changers and is exactly what ADI Part 3 training addresses — building your confidence delivering structured lessons before you teach independently."),
            ("Can I train for my ADI while still in a call centre job?", "Yes, most candidates keep their job through the theory and practical stages, transitioning once they start building a pupil base as a PDI."),
            ("Does customer service experience actually matter for the ADI qualification?", "It matters a great deal for Part 3, which assesses your ability to communicate and coach a pupil, not just your own driving."),
            ("What's the biggest lifestyle change moving from a call centre to instructing?", "Being away from a desk and screen all day, working outdoors and face-to-face, and setting your own schedule rather than working to call metrics."),
        ],
        'cta_wa_text': "Hi! I work in a call centre and I'm interested in training as a DriveSQ driving instructor",
    },
    {
        'slug': 'join-driving-instructor-tradespeople',
        'audience': 'Tradespeople & Self-Employed Workers',
        'badge': 'For Tradespeople &amp; the Self-Employed',
        'h1': 'From Tradesperson to Driving Instructor',
        'meta_desc': "Self-employed tradespeople already understand running their own diary and client relationships. See how those skills transfer into a career as a DriveSQ driving instructor.",
        'hero_sub': "You already run your own diary, quote your own jobs and manage your own clients. Instructing is one of the few trades where the tools are just your car and your patience.",
        'intro': "Electricians, plumbers, joiners and other self-employed tradespeople already understand the reality of running an independent business — quoting jobs, managing a diary, and building a client base through reputation. Driving instruction runs on exactly the same model, without the physical toll, materials cost or chasing invoices that come with most trades.",
        'pain_points': [
            "Physical wear and tear that builds up over years on the tools",
            "Unpredictable income between jobs and slow payers",
            "Rising material and van costs eating into margins",
            "Difficulty scaling your income without taking on staff",
        ],
        'skills': [
            "Genuine experience running a self-employed business, quoting and invoicing",
            "Strong reputation-building instincts from word-of-mouth trade work",
            "Reliability and time-management from job-to-job scheduling",
            "Comfortable working independently with minimal supervision",
        ],
        'quote': "Fifteen years as a joiner wrecked my knees. I already knew how to run a diary and get referrals — instructing let me keep being self-employed without lifting anything heavier than a clipboard.",
        'quote_name': 'Former tradesperson, now DriveSQ ADI',
        'faqs': [
            ("Is instructing genuinely self-employed, like my trade?", "Yes, DriveSQ instructors work independently and manage their own diary and areas, much like running any other self-employed trade — without franchise fees taking a cut."),
            ("How does the earning model compare to a trade?", "You charge per lesson hour rather than per job, with far lower overheads than most trades — no materials, van running costs are minimal by comparison, and no chasing invoices."),
            ("Can I train around existing trade work?", "Yes, many tradespeople complete ADI training around ongoing jobs, transitioning once qualified and building a pupil base."),
            ("Is there real demand for instructors in Manchester right now?", "Yes, DriveSQ currently has more pupil enquiries than instructor capacity across Greater Manchester, particularly in Stockport, Sale and South Manchester."),
        ],
        'cta_wa_text': "Hi! I'm a tradesperson interested in training as a DriveSQ driving instructor",
    },
    {
        'slug': 'join-driving-instructor-care-workers',
        'audience': 'Care & Support Workers',
        'badge': 'For Care &amp; Support Workers',
        'h1': 'From Care Worker to Driving Instructor',
        'meta_desc': "Care and support workers already have the patience, empathy and communication skills to excel as a driving instructor. Learn about the ADI path with DriveSQ Manchester.",
        'hero_sub': "You already build trust with people at their most vulnerable and explain things patiently, again and again. Few backgrounds prepare you better for teaching a nervous learner.",
        'intro': "Care and support work demands patience, empathy and the ability to explain the same thing calmly multiple times without frustration — precisely the temperament that makes a genuinely good driving instructor. The sector's low pay relative to its emotional demands is the most common reason care workers look elsewhere, and instructing offers a way to keep using those same skills for better reward.",
        'pain_points': [
            "Low pay relative to the emotional and physical demands of the role",
            "Understaffing that leads to rushed, stressful shifts",
            "Emotionally demanding work with limited support",
            "Irregular shift patterns including nights and weekends",
        ],
        'skills': [
            "Deep patience and empathy built from supporting vulnerable people",
            "Calm, reassuring communication style",
            "Experience explaining tasks step-by-step, repeatedly, without frustration",
            "Strong reliability and a genuine duty of care",
        ],
        'quote': "Care work teaches you patience you can't fake. My first nervous pupil stalled eleven times at the same junction — in my old job that would've been a normal Tuesday.",
        'quote_name': 'Former care worker, now DriveSQ PDI',
        'faqs': [
            ("Will my care experience actually help with teaching driving?", "Enormously — the patience and calm, repetitive explanation skills central to care work are exactly what DVSA examiners assess in ADI Part 3."),
            ("Can I train for my ADI while still working care shifts?", "Yes, many care workers train around existing shifts before transitioning once qualified and building a pupil base."),
            ("Is the pay better than care work?", "Most former care workers find instructing better paid per hour, without the physical and emotional toll of understaffed shift work."),
            ("Do I need a driving-related background to succeed?", "No — DVSA cares more about your driving standard and coaching ability than your previous job title. Many of the best instructors come from caring professions."),
        ],
        'cta_wa_text': "Hi! I work in care and I'm interested in training as a DriveSQ driving instructor",
    },
    {
        'slug': 'join-driving-instructor-ex-forces',
        'audience': 'Ex-Forces & Armed Forces Veterans',
        'badge': 'For Ex-Forces &amp; Veterans',
        'h1': 'From Forces Life to Driving Instructor',
        'meta_desc': "Armed forces veterans bring exceptional discipline, driving standards and calm under pressure to civilian life. Discover the ADI career path with DriveSQ Manchester.",
        'hero_sub': "Military life trained you to a standard most civilians never reach — discipline, composure, and often advanced driving qualifications already in hand.",
        'intro': "Service leavers regularly hold driving standards, discipline and situational awareness well above the civilian average, and many already hold advanced military driving qualifications. Driving instruction is one of the most popular and successful second careers for veterans — structured, self-directed, and built on skills the forces already gave you.",
        'pain_points': [
            "Uncertainty finding a civilian career that values military-honed skills",
            "Missing the structure and standards of service life",
            "Struggling to find flexible, self-directed work post-service",
            "Employers who don't recognise the value of forces experience",
        ],
        'skills': [
            "Exceptional discipline, punctuality and professional standards",
            "Advanced vehicle control, often from military driving qualifications",
            "Calm decision-making under genuine pressure",
            "Strong leadership and communication skills from service roles",
        ],
        'quote': "Twelve years in the Army gave me driving standards most civilian instructors never see. What DriveSQ helped with was translating military discipline into a teaching style that actually works for a nervous 17-year-old.",
        'quote_name': 'Army veteran, now DriveSQ ADI',
        'faqs': [
            ("Do military driving qualifications count toward the ADI badge?", "They don't replace any part of the ADI process directly, but the advanced vehicle handling most service leavers hold makes the Part 2 practical test straightforward."),
            ("Is there support for veterans transitioning into instructing?", "Many ADI training providers offer resettlement-friendly routes, and forces discipline and structure translate well into the ADI syllabus — DriveSQ is happy to talk through your specific background."),
            ("Can ELCAS or resettlement funding be used for ADI training?", "Funding routes vary by service and circumstance — this is worth discussing directly with your resettlement team and a registered ADI training provider."),
            ("What do veterans say is the biggest adjustment?", "Most say it's less about the driving and more about developing a patient, coaching-led teaching style for civilian learners rather than a command-and-control approach."),
        ],
        'cta_wa_text': "Hi! I'm a forces veteran interested in training as a DriveSQ driving instructor",
    },
    {
        'slug': 'join-driving-instructor-emergency-services',
        'audience': 'Police, Fire & Emergency Services Leavers',
        'badge': 'For Emergency Services Leavers',
        'h1': 'From Emergency Services to Driving Instructor',
        'meta_desc': "Former police, fire and ambulance staff bring advanced driving skills and composure under pressure to a second career as a driving instructor. See the ADI path with DriveSQ Manchester.",
        'hero_sub': "You've driven under genuine pressure and handled situations most people never see. Teaching a learner their first three-point turn will not test you the way your old job did.",
        'intro': "Police, fire and ambulance staff often hold advanced driver training and a level of composure under pressure that translates directly into confident, structured teaching. For those leaving the emergency services, driving instruction is a well-worn second career — self-directed, respected, and built on a driving standard most candidates spend years trying to reach.",
        'pain_points': [
            "Physically and emotionally demanding shift patterns",
            "Difficulty finding civilian work that matches your training and standards",
            "Missing the structure and purpose of frontline service",
            "Wanting flexible, self-directed work after years of shift rotas",
        ],
        'skills': [
            "Advanced driving skills, often including blue-light or pursuit training",
            "Genuine composure under pressure",
            "Sharp hazard perception and risk assessment",
            "Strong communication skills from public-facing frontline roles",
        ],
        'quote': "Twenty years in the police, the last eight as an advanced driver instructor internally. Moving to ADI teaching after leaving felt like the most natural next step there was.",
        'quote_name': 'Former police officer, now DriveSQ ADI',
        'faqs': [
            ("Does advanced driver training from the emergency services help toward the ADI badge?", "It doesn't replace any part of the ADI process, but advanced driving backgrounds typically make the Part 2 practical test very straightforward."),
            ("Is instructing a common second career for emergency services leavers?", "Yes, it's one of the most established second careers for police, fire and ambulance leavers, given the driving standards and public-facing skills already in place."),
            ("Can I train while still serving, ahead of leaving?", "Many candidates begin ADI theory and practical training in the lead-up to leaving service, so they're ready to start as a PDI shortly after their final day."),
            ("What's the biggest adjustment moving into civilian instructing?", "Most say it's shifting from a command-driven communication style to the patient, coaching-led approach ADI Part 3 assesses."),
        ],
        'cta_wa_text': "Hi! I'm leaving/have left the emergency services and I'm interested in training as a DriveSQ driving instructor",
    },
    {
        'slug': 'join-driving-instructor-redundancy',
        'audience': 'Recently Made Redundant',
        'badge': 'For Anyone Recently Made Redundant',
        'h1': 'Made Redundant? Consider Driving Instruction',
        'meta_desc': "Redundancy is a genuine opportunity to restart on your own terms. See why driving instruction is one of the most accessible, well-supported second careers with DriveSQ Manchester.",
        'hero_sub': "Redundancy is unwanted, but it's also one of the few moments you can genuinely choose your next move instead of drifting into the next available job.",
        'intro': "Redundancy forces a decision most people never make deliberately: what do you actually want your working life to look like next? Driving instruction is one of the most accessible career restarts available — no degree required, a clear, structured qualification path, and genuine control over your hours and income from day one.",
        'pain_points': [
            "Uncertainty about what career to move into next",
            "Worry about starting again from the bottom in a new industry",
            "Needing an income route that doesn't require years of retraining",
            "Wanting more control after being let go by decisions outside your control",
        ],
        'skills': [
            "Whatever industry you're coming from, you already hold a valid driving licence — the essential starting point",
            "Life and work experience that builds patience and credibility with learners",
            "A genuine motivation to build something on your own terms",
            "Transferable communication and reliability from your previous career",
        ],
        'quote': "Redundancy after eleven years at the same company was the push I needed. Six months later I was a PDI. It's the first time in a decade my income has depended entirely on my own effort, not someone else's decision.",
        'quote_name': 'Career-changer, now DriveSQ PDI',
        'faqs': [
            ("How quickly can I start earning again after redundancy?", "Many candidates begin working as a PDI (trainee instructor) under supervision before fully qualifying, generating income during the later stages of training rather than waiting until the end."),
            ("Is ADI training realistic without savings to fall back on?", "Costs and pace vary by provider — it's worth discussing your specific circumstances and timeline directly, including whether part-time training alongside interim work suits you better."),
            ("Do I need experience in a driving-related job already?", "No. The ADI qualification is open to anyone who meets the age, licence and DBS requirements, regardless of previous industry."),
            ("What if I'm not sure driving instruction is right for me?", "Get in touch and we'll talk honestly about what the job actually involves day to day, so you can decide with real information rather than guesswork."),
        ],
        'cta_wa_text': "Hi! I've been made redundant and I'm exploring training as a DriveSQ driving instructor",
    },
    {
        'slug': 'join-driving-instructor-career-change-40-plus',
        'audience': 'Career Changers Over 40',
        'badge': 'For Career Changers 40+',
        'h1': "It's Not Too Late to Become a Driving Instructor",
        'meta_desc': "There is no upper age limit for becoming a driving instructor. See why 40, 50 and even 60-plus is a genuinely common — and successful — age to start ADI training with DriveSQ.",
        'hero_sub': "There's no upper age limit on the ADI qualification. Life experience is an asset in this job, not a liability.",
        'intro': "Driving instruction is unusual among second careers in that experience and maturity are genuinely an advantage, not a hurdle. Many of the most in-demand instructors qualified in their 40s, 50s or later, bringing patience and life experience that younger instructors simply haven't had time to build yet. If you've been putting off a career change because you think you've left it too late, this is one of the few fields where that isn't true.",
        'pain_points': [
            "Feeling stuck in a career that no longer fits your life",
            "Worrying that changing career at 40+ means starting from nothing",
            "Wanting more flexibility as family or personal circumstances change",
            "Concern that a new industry won't value your existing experience",
        ],
        'skills': [
            "Life experience and patience that pupils and parents genuinely respond well to",
            "Established communication and people skills from years in the workforce",
            "A settled, credible presence that reassures nervous learners and parents alike",
            "Motivation and self-discipline built over a full working life",
        ],
        'quote': "I qualified at 47 after twenty years in an office job I'd stopped enjoying. My pupils' parents actually prefer that I'm not twenty-five — there's a trust that comes with a bit of grey hair.",
        'quote_name': 'Career-changer, qualified at 47, now DriveSQ ADI',
        'faqs': [
            ("Is there an age limit to become a driving instructor?", "No upper age limit exists for the ADI qualification. You must be at least 21 to start, but there is no maximum — many instructors qualify well into their 50s and 60s."),
            ("Will I be at a disadvantage against younger instructors?", "Not at all — many pupils and parents specifically prefer an instructor with life experience and a calm, mature teaching style."),
            ("How long does training realistically take alongside a current job?", "Most candidates complete the three-part ADI qualification within six months to two years, working around existing commitments."),
            ("Is it financially viable to retrain at this stage of life?", "Many candidates work as a PDI under supervision during the final stage of training, generating income before full qualification rather than facing a long unpaid gap."),
        ],
        'cta_wa_text': "Hi! I'm considering a career change into driving instruction and I'd like to know more about DriveSQ",
    },
    {
        'slug': 'join-driving-instructor-stay-at-home-parents',
        'audience': 'Parents Returning to Work',
        'badge': 'For Parents Returning to Work',
        'h1': 'Driving Instructor Jobs That Work Around School Hours',
        'meta_desc': "Driving instruction offers genuine school-hours flexibility for parents returning to work. See how DriveSQ supports parents training as ADIs and PDIs in Manchester.",
        'hero_sub': "Few careers let you genuinely choose school-hours-only work, term-time-only weeks, or whatever pattern actually fits your family — driving instruction is one of them.",
        'intro': "Returning to work after time raising children usually means compromising — on hours, on pay, or on the job itself. Driving instruction is one of the rare careers where you can build a genuinely flexible working pattern around school runs, holidays and family life, without settling for entry-level pay to get that flexibility.",
        'pain_points': [
            "Struggling to find work that fits genuinely around school hours",
            "Feeling forced to accept lower pay in exchange for flexibility",
            "A confidence gap after time away from the workforce",
            "Childcare costs eating into the value of returning to a low-flexibility job",
        ],
        'skills': [
            "Exceptional patience and communication from parenting",
            "Strong organisational skills from managing a household and family schedule",
            "Calm, reassuring manner that puts nervous young learners at ease",
            "Reliability and time-management built from years of school-run logistics",
        ],
        'quote': "I hadn't worked in six years and had no idea what I was qualified for anymore. Instructing let me build my diary entirely around school hours, and my pupils' parents love that I genuinely understand their teenager.",
        'quote_name': 'Parent returning to work, now DriveSQ ADI',
        'faqs': [
            ("Can I really work school hours only as an instructor?", "Yes — DriveSQ instructors set their own diary. Many parents structure their week around 9:30am to 2:30pm, term-time only, with holidays off entirely."),
            ("Do I need recent work experience to start ADI training?", "No, there's no requirement for recent employment — just the standard age, licence and DBS requirements for the ADI qualification."),
            ("Is the training itself flexible enough to fit around children?", "Most training providers offer flexible scheduling for theory study and practical sessions, and DriveSQ can talk through what fits your household best."),
            ("Will time away from the workforce affect my application?", "No — DVSA assesses your driving ability and instructing potential, not your employment history."),
        ],
        'cta_wa_text': "Hi! I'm returning to work and interested in training as a DriveSQ driving instructor around school hours",
    },
    {
        'slug': 'join-driving-instructor-women',
        'audience': 'Women Considering Driving Instruction',
        'badge': 'For Women Considering Instructing',
        'h1': 'Why More Women Are Becoming Driving Instructors',
        'meta_desc': "Female driving instructors are in high demand across Manchester, with many pupils specifically requesting one. Find out why DriveSQ is actively encouraging women to train as ADIs.",
        'hero_sub': "Demand for female instructors consistently outstrips supply. If you've ever considered it, there has never been a better time to start.",
        'intro': "Across the driving instruction industry, women remain under-represented despite consistently high pupil demand — many nervous learners, and parents of teenage daughters, specifically request a female instructor. That demand imbalance means female ADIs are rarely short of pupils, and DriveSQ is actively encouraging more women to train, in an industry that offers genuine flexibility, independence and strong earning potential.",
        'pain_points': [
            "Feeling like driving instruction is a male-dominated industry not built for you",
            "Uncertainty about whether there's real demand for female instructors",
            "Wanting a career with genuine independence and flexible hours",
            "Concern about starting in an unfamiliar, self-employed-style role",
        ],
        'skills': [
            "Whatever background you come from, existing driving experience and a full licence is your starting point",
            "Patience and communication skills built from any people-facing background",
            "A calm presence that many nervous learners specifically seek out",
            "Independence and organisational skills that suit self-directed work",
        ],
        'quote': "I nearly didn't apply because I assumed it was a man's industry. Within three months of qualifying, half my pupils had specifically requested a female instructor. I've never been short of work since.",
        'quote_name': 'Female DriveSQ ADI',
        'faqs': [
            ("Is there genuinely more demand for female instructors?", "Yes — many parents of teenage girls, and nervous adult learners of any gender, specifically request a female instructor, and demand regularly outstrips the number of qualified women in the industry."),
            ("Do I need any driving-related work background?", "No — the ADI qualification is open to anyone who meets the age, licence and DBS requirements, regardless of previous career."),
            ("Will I be supported as a newly qualified female instructor at DriveSQ?", "Yes, DriveSQ operates a supportive, non-franchise culture, and new instructors are matched with pupils in their chosen areas from day one."),
            ("Is the job safe working alone with pupils?", "DriveSQ takes instructor safety seriously — pupils are DBS-appropriate for their age group, lessons are logged, and instructors set their own comfort boundaries on pickup locations and hours."),
        ],
        'cta_wa_text': "Hi! I'm a woman considering training as a DriveSQ driving instructor and I'd like to know more",
    },
    {
        'slug': 'join-driving-instructor-graduates',
        'audience': 'Graduates & Career Starters',
        'badge': 'For Graduates &amp; Career Starters',
        'h1': 'Driving Instruction as a Graduate Career',
        'meta_desc': "Driving instruction is an underrated graduate career — genuine independence, strong earning potential and no need to wait for a corporate ladder. See the ADI route with DriveSQ Manchester.",
        'hero_sub': "Not every graduate career has to mean an entry-level desk job and a five-year wait for autonomy. Driving instruction hands you independence from day one.",
        'intro': "Graduate career paths often mean years in an entry-level role before any real autonomy or earning potential arrives. Driving instruction inverts that entirely — once qualified, you run your own diary, set your own hours and build your own client base immediately, with no corporate ladder to climb first.",
        'pain_points': [
            "Graduate job markets that feel oversaturated and underpaid at entry level",
            "Years of waiting for autonomy or meaningful responsibility",
            "Office-based roles that don't suit your personality or interests",
            "Student debt pressure and a need for genuinely strong earning potential early on",
        ],
        'skills': [
            "Strong communication and organisational skills from academic study",
            "Comfortable with structured, assessed learning — directly relevant to ADI training",
            "Adaptability and quick learning ability",
            "A fresh perspective that resonates well with younger learners",
        ],
        'quote': "I graduated into a job market that felt impossible. Instructing meant I was running my own diary and earning properly within a year — faster than most of my coursemates who went the graduate-scheme route.",
        'quote_name': 'Graduate, now DriveSQ ADI',
        'faqs': [
            ("Is driving instruction a realistic graduate career?", "Yes — it requires no degree at all, but graduates often progress through the structured ADI syllabus quickly given strong study habits from university."),
            ("What's the minimum age to qualify?", "You must be at least 21 and have held a full licence for three years, so this suits graduates a few years out from their driving test as much as recent leavers."),
            ("Is the earning potential genuinely good for a first career?", "Instructor income scales directly with the hours you teach and your reputation, with no corporate ladder or entry-level pay scale to work through first."),
            ("Will pupils take a younger instructor seriously?", "Yes — many younger pupils specifically respond well to an instructor closer to their own age and experience."),
        ],
        'cta_wa_text': "Hi! I'm a graduate/early career and interested in training as a DriveSQ driving instructor",
    },
    {
        'slug': 'join-driving-instructor-pdi-to-adi',
        'audience': 'PDIs Ready to Qualify as ADI',
        'badge': 'For Trainee PDIs',
        'h1': 'PDI to ADI: Finish Your Qualification with DriveSQ',
        'meta_desc': "Already a PDI working toward your green badge? DriveSQ offers structured mentoring, guaranteed pupil supply and support through Part 3 and the Standards Check. Join us in Manchester.",
        'hero_sub': "You've already passed Parts 1 and 2. The final stretch — building real teaching experience toward Part 3 — is where the right school makes all the difference.",
        'intro': "Reaching PDI status means you've already cleared the hardest theoretical and practical hurdles of ADI qualification. What matters most now is the quality of your supervised teaching practice: a steady flow of real pupils, honest feedback, and a school that invests in getting you to your green badge rather than just using you as cheap trainee labour under a pink badge.",
        'pain_points': [
            "Franchise schools that treat PDIs as cheap labour with poor pupil supply",
            "Inconsistent mentoring and vague feedback on your teaching",
            "Struggling to get enough varied pupils to build real Part 3 experience",
            "Franchise fees eating into already-limited trainee income",
        ],
        'skills': [
            "You already hold your pink trainee licence and have passed the hardest ADI stages",
            "Real supervised teaching experience under your training instructor",
            "A demonstrated commitment to qualifying — most of the hard work is already done",
            "Whatever brought you to driving instruction, that motivation carries through",
        ],
        'quote': "I was a PDI at a franchise school getting maybe six lessons a week and no real feedback. DriveSQ gave me a proper pupil base and an actual mentor. I passed my Standards Check three months after switching.",
        'quote_name': 'Former franchise PDI, now DriveSQ ADI',
        'faqs': [
            ("Can I switch to DriveSQ as a PDI mid-training?", "Yes, PDIs regularly switch schools during their trainee period — DriveSQ can pick up your mentoring and pupil supply immediately."),
            ("Does DriveSQ charge franchise fees for PDIs?", "No, DriveSQ operates without franchise fees, so more of what you earn as a trainee instructor stays with you."),
            ("Will I get enough pupils to build real Part 3 experience?", "DriveSQ currently has more pupil enquiries across Greater Manchester than instructor capacity, so PDIs are matched with a genuine, steady pupil base."),
            ("What kind of mentoring support is available?", "DriveSQ provides structured guidance and feedback as you build toward your Standards Check, from instructors who've been through the same process."),
        ],
        'cta_wa_text': "Hi! I'm a PDI working toward my ADI qualification and I'm interested in joining DriveSQ",
    },
    {
        'slug': 'join-driving-instructor-switch-franchise',
        'audience': 'Qualified ADIs Leaving a Franchise',
        'badge': 'For Qualified ADIs',
        'h1': 'Switch from a Franchise to an Independent School',
        'meta_desc': "Tired of franchise fees eating into your income? See why qualified ADIs across Manchester are switching to DriveSQ's independent, no-franchise-fee model.",
        'hero_sub': "You already have your green badge. The only question is whether your current school is actually working for you — or just taking a cut.",
        'intro': "Many qualified ADIs stay with the franchise school they originally trained under out of habit rather than genuine benefit, watching a weekly fee disappear regardless of how many lessons they teach. Switching to an independent school like DriveSQ means keeping what you earn, working with a smaller, more collaborative team, and still getting consistent pupil enquiries — without the overhead.",
        'pain_points': [
            "Weekly or monthly franchise fees regardless of how many lessons you teach",
            "Lead generation that doesn't match what you're paying for",
            "Corporate, faceless management with little flexibility",
            "Pressure to hit lesson volume targets over quality teaching",
        ],
        'skills': [
            "A full DVSA green badge and established teaching experience",
            "An existing pupil base or reputation you can bring with you",
            "A track record you can point to — pass rates, reviews, referrals",
            "Clear reasons for wanting more control over your working model",
        ],
        'quote': "I was paying nearly £200 a week in franchise fees before I'd taught a single lesson. DriveSQ has no franchise fee, a genuinely supportive team, and I still get a steady stream of new pupils.",
        'quote_name': 'Former franchise ADI, now with DriveSQ',
        'faqs': [
            ("What does DriveSQ charge instructors compared to a franchise?", "DriveSQ operates with no franchise fees — instructors keep what they earn rather than paying a fixed weekly or monthly charge regardless of lesson volume."),
            ("Will I still get a steady flow of new pupils?", "Yes, DriveSQ currently has more pupil enquiries across Greater Manchester than instructor capacity, and pupils are matched to instructors by area."),
            ("Can I bring my existing pupils with me when I switch?", "In most cases yes, subject to your current school's contract terms — this is worth checking before giving notice."),
            ("How much notice do I need to give my current franchise?", "This depends entirely on your existing contract — check your notice period and any restrictive terms before switching, and DriveSQ is happy to talk through timing."),
        ],
        'cta_wa_text': "Hi! I'm a qualified ADI currently at a franchise school and interested in switching to DriveSQ",
    },
    {
        'slug': 'join-driving-instructor-self-employed',
        'audience': 'Freelancers Wanting Stability',
        'badge': 'For Freelancers &amp; the Self-Employed',
        'h1': 'From Freelance Work to Driving Instruction',
        'meta_desc': "Freelancers already understand self-employment — driving instruction offers more predictable demand and local, recurring client relationships. See the ADI path with DriveSQ Manchester.",
        'hero_sub': "You already know the freelance grind — feast or famine, chasing invoices, unpredictable months. Instructing keeps the independence, minus the instability.",
        'intro': "Freelancers across creative, digital and consulting fields already understand the realities of self-employment — but often without the local, recurring demand that makes income predictable. Driving instruction offers the same independence with a genuinely stable, local client base: every learner driver in Greater Manchester eventually needs lessons, and demand doesn't disappear with the economy the way some freelance industries do.",
        'pain_points': [
            "Unpredictable, feast-or-famine income between projects or clients",
            "Chasing late invoices and unreliable payment terms",
            "Industries prone to sudden downturns or oversaturation",
            "Isolation from working alone without much face-to-face interaction",
        ],
        'skills': [
            "Established self-employment discipline — invoicing, scheduling, client management",
            "Comfortable managing your own diary and workload",
            "Strong communication skills from client-facing freelance work",
            "Resilience and adaptability built from freelance income variability",
        ],
        'quote': "Freelance design work meant some months were great and some were a genuine worry. Driving lessons are something every single learner in Manchester needs — that recurring, local demand was the stability I never had before.",
        'quote_name': 'Former freelancer, now DriveSQ ADI',
        'faqs': [
            ("Is instructor income more stable than freelance work?", "Most former freelancers find it far more predictable — lesson demand is local, constant and not tied to broader economic or industry cycles the way many freelance fields are."),
            ("Can I keep freelancing part-time while I train?", "Yes, many candidates train for their ADI around existing freelance commitments before transitioning fully."),
            ("Do I need to give up my creative or consulting work entirely?", "No — some instructors keep a small amount of freelance work alongside instructing, particularly in the early stages of building a pupil base."),
            ("What's different about client relationships as an instructor?", "Pupils typically book a block of recurring weekly lessons rather than one-off projects, giving you far more predictable, repeat income than most freelance work."),
        ],
        'cta_wa_text': "Hi! I currently freelance and I'm interested in training as a DriveSQ driving instructor",
    },
    {
        'slug': 'join-driving-instructor-driving-enthusiasts',
        'audience': 'Driving Enthusiasts',
        'badge': 'For Driving Enthusiasts',
        'h1': 'Turn Your Love of Driving into a Career',
        'meta_desc': "If driving is genuinely your favourite part of any day, becoming a driving instructor turns that passion into a career. Find out how with DriveSQ Manchester.",
        'hero_sub': "If you'd rather be behind the wheel than almost anywhere else, there's a version of that which pays — and it's teaching, not racing.",
        'intro': "Plenty of people enjoy driving. Fewer realise it can be an actual career rather than just the best part of the weekend. Driving instruction rewards genuine enthusiasm for the road — deep knowledge of vehicle control, real interest in safe, skilled driving, and the patience to pass that enthusiasm on to someone just starting out.",
        'pain_points': [
            "Stuck in a job with no connection to what you actually enjoy",
            "Driving only ever being the commute, never the point",
            "Wanting a career that lets you be genuinely good at something you care about",
            "Underusing a real, specific interest in cars and driving",
        ],
        'skills': [
            "Genuine enthusiasm and deep knowledge of vehicle control and road craft",
            "Motivation that comes naturally rather than needing to be manufactured",
            "Attention to detail around technique most casual drivers never develop",
            "Willingness to keep learning — advanced driving courses, CPD, technique",
        ],
        'quote': "I've loved driving since I was a teenager, track days, advanced courses, all of it. It never occurred to me that could be a job until a mate who'd already qualified mentioned it. Best career change I've made.",
        'quote_name': 'Driving enthusiast, now DriveSQ ADI',
        'faqs': [
            ("Does loving driving actually matter for the ADI qualification?", "Genuine enthusiasm helps enormously with motivation through training and long-term job satisfaction, though DVSA still assesses you on structured driving standards and teaching ability, not just passion."),
            ("Do I need track or advanced driving experience?", "No, it's not required, though any additional driving qualifications or experience can strengthen your overall driving standard going into Part 2."),
            ("Is instructing as exciting as I'd hope, day to day?", "It's a different kind of satisfaction — less about speed, more about the reward of watching someone go from anxious learner to confident, safe driver."),
            ("How do I know if I'd actually enjoy teaching, not just driving?", "Get in touch and we'll talk honestly about what the day-to-day coaching side involves, so you know before committing to training."),
        ],
        'cta_wa_text': "Hi! I love driving and I'm interested in training as a DriveSQ driving instructor",
    },
    {
        'slug': 'join-driving-instructor-shift-workers',
        'audience': 'Night-Shift & Rotating-Shift Workers',
        'badge': 'For Night &amp; Rotating-Shift Workers',
        'h1': 'From Shift Work to Daytime Hours You Control',
        'meta_desc': "Tired of rotating shifts and disrupted sleep? Driving instruction offers genuinely predictable daytime hours you set yourself. Discover the ADI path with DriveSQ Manchester.",
        'hero_sub': "Rotating shifts wreck your sleep, your relationships and your weekends. Instructing hands you back a normal working week — on your own terms.",
        'intro': "Years of rotating or night shifts take a real toll — disrupted sleep, missed family time, and a working pattern that never settles. Driving instruction offers something rare: genuinely predictable daytime hours that you set yourself, with no rota, no night shifts, and no manager deciding your pattern six weeks in advance.",
        'pain_points': [
            "Disrupted sleep and long-term health impact from rotating or night shifts",
            "Missing weekends, evenings and family events tied to your rota",
            "Fatigue that affects both work and home life",
            "No say over your own working pattern",
        ],
        'skills': [
            "Discipline and resilience built from demanding shift patterns",
            "Comfortable working independently without close supervision",
            "Reliability under pressure and fatigue",
            "Strong time-management from juggling irregular hours",
        ],
        'quote': "Eight years of rotating shifts at a plant meant I barely had a normal weekend. As an instructor I choose my own days now — first time in a decade I've had a genuinely predictable week.",
        'quote_name': 'Former shift worker, now DriveSQ ADI',
        'faqs': [
            ("Can I really set my own hours as a driving instructor?", "Yes — DriveSQ instructors build their own diary. Most choose consistent daytime hours, though some retain flexibility for evenings if that suits them better."),
            ("Can I train for my ADI while still working shifts?", "Yes, many shift workers train around existing rotas, using days off for practical training sessions before transitioning fully."),
            ("Will my income be as stable as a shift-work wage?", "Instructor income scales with the hours you teach, and most instructors build toward a full, stable weekly diary once they're established with regular pupils."),
            ("Is instructing physically less demanding than shift work?", "Most former shift workers find it significantly less taxing — regular daytime hours with none of the long-term sleep disruption of rotating shifts."),
        ],
        'cta_wa_text': "Hi! I currently work shifts and I'm interested in training as a DriveSQ driving instructor for regular daytime hours",
    },
]

print(f'{len(AUDIENCES)} audience entries loaded')

CSS = '''
:root{--red:#D10A11;--red2:#9e0008;--blk:#070707;--dk:#0f0f0f;--dk2:#161616;--bdr:#252525;--txt:#f0f0f0;--gold:#F5C518;--green:#25D366;--green2:#1da851;--r:12px;--rs:8px;--sh:0 8px 40px rgba(0,0,0,.55);--trans:.22s ease}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;overflow-x:hidden}
body{background:#fff;color:#111;font-family:'Inter',sans-serif;line-height:1.7;overflow-x:hidden}
h1,h2,h3,h4{font-family:'Oswald',sans-serif;line-height:1.05}
a{color:var(--red);text-decoration:none;transition:color var(--trans)}a:hover{color:var(--red2)}
img{max-width:100%;height:auto;display:block}
.ann{background:linear-gradient(90deg,#9e0008,var(--red) 50%,#9e0008);color:#fff;font-size:.78rem;font-weight:600;padding:7px 0;text-align:center}
.ann a{color:#fff;text-decoration:underline dotted}.ann .sep{opacity:.4;margin:0 8px}
.navbar{background:var(--blk);border-bottom:2px solid var(--red);padding:0}
.nav-inner{padding:8px 0}
.nlogo{width:46px;height:46px;border-radius:50%;border:2px solid var(--red);flex-shrink:0}
.nbrand{font-family:'Oswald',sans-serif;font-size:1.65rem;font-weight:700;color:#fff;letter-spacing:1.5px;line-height:1}.nbrand .r{color:var(--red)}
.ntag{font-size:.58rem;color:#444;letter-spacing:2px;text-transform:uppercase;line-height:1;margin-top:2px}
.navbar .nav-link{color:#888;font-weight:500;font-size:.82rem;padding:.5rem .65rem!important;transition:color var(--trans)}.navbar .nav-link:hover{color:#fff}
.btn-nav-wa{background:#25D366;color:#fff!important;border:none;border-radius:6px;font-weight:700;font-size:.8rem;padding:.4rem .85rem;display:inline-flex;align-items:center;gap:5px}.btn-nav-wa:hover{background:#1da851}
.btn-nav-bk{background:var(--red);color:#fff!important;border:none;border-radius:6px;font-family:'Oswald',sans-serif;font-weight:600;font-size:.88rem;padding:.4rem .9rem;display:inline-flex;align-items:center;gap:5px}.btn-nav-bk:hover{background:var(--red2)}
.hero-sm{background:var(--blk);padding:48px 0 40px;position:relative;overflow:hidden}
.hero-sm::after{content:'';position:absolute;bottom:0;left:0;right:0;height:60px;background:linear-gradient(transparent,#fff)}
.hero-sm h1{font-size:clamp(1.8rem,4vw,2.8rem);font-weight:700;color:#fff;line-height:.98;margin-bottom:10px}.hero-sm h1 .r{color:var(--red)}
.hero-sm .sub{color:#999;font-size:.95rem;max-width:620px;margin-bottom:14px}
.badge-pill{display:inline-flex;align-items:center;gap:7px;background:rgba(37,211,102,.1);border:1px solid rgba(37,211,102,.3);color:#3ddc84;font-size:.67rem;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;padding:4px 13px;border-radius:999px;margin-bottom:14px}
.hp{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);color:#aaa;font-size:.73rem;padding:4px 11px;border-radius:999px;margin:3px}.hp .dot{width:6px;height:6px;border-radius:50%;background:var(--red);flex-shrink:0}
.stats-bar{background:var(--blk);border-top:2px solid var(--red);border-bottom:1px solid var(--bdr);padding:18px 0}
.stat{text-align:center;padding:0 18px}.stat-num{font-family:'Oswald',sans-serif;font-size:clamp(1.5rem,3vw,2.3rem);font-weight:700;color:var(--red);line-height:1}.stat-lbl{font-size:.63rem;color:#555;text-transform:uppercase;letter-spacing:1.1px;margin-top:2px}.stat-sep{width:1px;background:var(--bdr)}
.sw{background:#fff;padding:52px 0}.sg{background:#f6f6f6;padding:52px 0}.sd{background:var(--blk);padding:52px 0}
.eye{font-size:.65rem;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--red);display:block;margin-bottom:4px}
.sec-t{font-family:'Oswald',sans-serif;font-size:clamp(1.75rem,3.8vw,2.75rem);font-weight:700;line-height:1.05}
.sec-s{color:#777;font-size:.91rem;margin-top:8px;line-height:1.7}
.tr{color:var(--red)!important}.tg{color:var(--gold)!important}.tgr{color:#16a34a!important}
.tc{background:#fff;border:1px solid #e8e8e8;border-radius:var(--r);padding:20px 18px;height:100%;transition:all var(--trans);position:relative;overflow:hidden}
.tc::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--red),#ff4444);transform:scaleX(0);transition:transform var(--trans);transform-origin:left}
.tc:hover{transform:translateY(-4px);box-shadow:0 18px 45px rgba(0,0,0,.09)}.tc:hover::before{transform:scaleX(1)}
.tc-ico{width:40px;height:40px;border-radius:10px;background:rgba(37,211,102,.08);border:1px solid rgba(37,211,102,.18);display:flex;align-items:center;justify-content:center;color:#16a34a;font-size:1.05rem;margin-bottom:12px;flex-shrink:0}
.tc-t{font-family:'Oswald',sans-serif;font-size:1rem;font-weight:600;margin-bottom:7px}.tc-d{font-size:.83rem;color:#666;line-height:1.65}
.prose p{font-size:.9rem;line-height:1.82;color:#444;margin-bottom:13px}.prose h3{font-size:1.2rem;margin:24px 0 10px;color:#111;font-family:'Oswald',sans-serif}.prose ul{padding-left:1.3rem;margin-bottom:13px}.prose li{font-size:.88rem;line-height:1.75;color:#444;margin-bottom:7px}.prose strong{color:#222}
.hl-box{background:linear-gradient(135deg,#f0fdf4,#fff);border:1px solid #bbf7d0;border-left:4px solid #16a34a;border-radius:var(--rs);padding:16px 18px}
.hl-box.gold{background:linear-gradient(135deg,#fffbeb,#fff);border-color:#fde68a;border-left-color:var(--gold)}
.hl-box h4{font-size:.95rem;margin-bottom:9px;font-family:'Oswald',sans-serif}
.hl-box ul{padding-left:1.1rem;margin:0}.hl-box li{font-size:.83rem;line-height:1.7;color:#444}
.quote-box{background:#faf7f2;border:1px solid #eee0cc;border-radius:14px;padding:22px 26px;margin:26px 0;position:relative}
.quote-box p{font-size:1rem;font-style:italic;color:#333;line-height:1.7;margin-bottom:10px}
.quote-box cite{font-size:.78rem;color:#888;font-style:normal;font-weight:600}
.step-num{width:30px;height:30px;border-radius:50%;background:var(--red);color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Oswald',sans-serif;font-weight:700;font-size:.88rem;margin-bottom:10px;flex-shrink:0}
.bc{background:#f8f8f8;border-bottom:1px solid #ebebeb;padding:8px 0;font-size:.75rem;color:#888}.bc a{color:#888}.bc a:hover{color:var(--red)}.bc-sep{margin:0 6px;opacity:.4}
.btn-wa-lg{background:#25D366;color:#fff;border:none;border-radius:var(--rs);font-family:'Oswald',sans-serif;font-size:1rem;font-weight:600;padding:.68rem 1.6rem;display:inline-flex;align-items:center;gap:8px;transition:all var(--trans)}.btn-wa-lg:hover{background:#1da851;color:#fff;transform:translateY(-2px)}
.btn-red-lg{background:var(--red);color:#fff;border:none;border-radius:var(--rs);font-family:'Oswald',sans-serif;font-size:1rem;font-weight:600;padding:.68rem 1.6rem;display:inline-flex;align-items:center;gap:8px;transition:all var(--trans)}.btn-red-lg:hover{background:var(--red2);color:#fff;transform:translateY(-2px)}
.btn-or-sm{border:1.5px solid var(--red);color:var(--red)!important;background:transparent;border-radius:var(--rs);font-family:'Oswald',sans-serif;font-weight:600;font-size:.85rem;padding:.5rem 1.1rem;display:inline-flex;align-items:center;gap:6px;transition:all var(--trans)}.btn-or-sm:hover{background:var(--red);color:#fff!important}
footer{background:var(--blk);color:#444;border-top:2px solid var(--red);padding:44px 0 18px}
.f-logo{font-family:'Oswald',sans-serif;font-size:1.9rem;font-weight:700;color:#fff;letter-spacing:1.5px}.f-logo span{color:var(--red)}
.f-head{font-family:'Oswald',sans-serif;font-weight:600;font-size:.75rem;text-transform:uppercase;letter-spacing:2px;color:#666;margin-bottom:11px}
footer a{color:#444;transition:color var(--trans)}footer a:hover{color:#fff}.f-list{list-style:none}.f-list li{padding:3px 0;font-size:.8rem}
.f-div{border-top:1px solid var(--bdr);margin-top:30px;padding-top:16px}
.soc{width:33px;height:33px;border-radius:50%;border:1px solid var(--bdr);display:inline-flex;align-items:center;justify-content:center;color:#444;font-size:.85rem;transition:all var(--trans)}.soc:hover{border-color:var(--red);color:#fff;background:var(--red)}
.mob-cta{position:sticky;bottom:0;z-index:1030;background:var(--blk);border-top:2px solid var(--red);padding:5px 0}@media(min-width:992px){.mob-cta{display:none!important}}
.reveal{opacity:0;transform:translateY(18px);transition:opacity .5s ease,transform .5s ease}.reveal.visible{opacity:1;transform:translateY(0)}
.cta-band{background:linear-gradient(135deg,var(--red),#ff3333);padding:48px 0;text-align:center}
.cta-band h2{color:#fff;margin-bottom:10px;font-size:clamp(1.6rem,3.5vw,2.4rem)}.cta-band p{color:rgba(255,255,255,.85);font-size:.93rem;margin-bottom:18px}
.rel-link{background:#f6f6f6;border:1px solid #e8e8e8;padding:6px 14px;border-radius:999px;font-size:.8rem;color:#444;display:inline-block;margin:4px;font-weight:600}.rel-link:hover{border-color:var(--red);color:var(--red)}
'''

NAV = f'''<nav class="navbar navbar-expand-lg sticky-top"><div class="container nav-inner d-flex align-items-center justify-content-between"><a href="index.html" class="d-flex align-items-center gap-2 text-decoration-none"><img src="{LOGO}" alt="DriveSQ Logo" class="nlogo"><div><div class="nbrand">DRIVE<span class="r">SQ</span></div><div class="ntag">Careers</div></div></a><button class="navbar-toggler border-0 text-white" type="button" data-bs-toggle="collapse" data-bs-target="#navC"><i class="bi bi-list fs-4"></i></button><div class="collapse navbar-collapse justify-content-end" id="navC"><ul class="navbar-nav align-items-lg-center gap-lg-1 mt-3 mt-lg-0"><li class="nav-item"><a class="nav-link" href="index.html">Home</a></li><li class="nav-item"><a class="nav-link" href="index.html#join">Join DriveSQ</a></li><li class="nav-item"><a class="nav-link" href="become-driving-instructor-manchester.html">Become an ADI</a></li><li class="nav-item"><a class="nav-link" href="about.html">About</a></li><li class="nav-item"><a class="nav-link" href="contact.html">Contact</a></li><li class="nav-item ms-lg-2"><a href="{WA}" target="_blank" rel="nofollow noopener" class="btn-nav-wa"><i class="bi bi-whatsapp"></i> WhatsApp</a></li></ul></div></div></nav>'''

FOOTER = f'''<footer><div class="container"><div class="row g-4"><div class="col-md-4"><div class="f-logo">Drive<span>SQ</span></div><p class="mt-2" style="font-size:.79rem;color:#333;max-width:265px;line-height:1.65">Manchester&rsquo;s #1 DVSA-approved driving school. No franchise fees for instructors. Growing across Greater Manchester.</p><div class="d-flex gap-2 mt-3"><a href="{WA}" target="_blank" rel="nofollow noopener" class="soc" style="color:#25D366;border-color:#1a2a1a"><i class="bi bi-whatsapp"></i></a><a href="https://www.instagram.com/drive_sq_academy/" target="_blank" rel="nofollow noopener" class="soc"><i class="bi bi-instagram"></i></a><a href="https://www.facebook.com/profile.php?id=100092258175464" target="_blank" rel="nofollow noopener" class="soc"><i class="bi bi-facebook"></i></a></div></div><div class="col-md-4"><div class="f-head">Careers</div><ul class="f-list"><li><a href="become-driving-instructor-manchester.html">Become a Driving Instructor</a></li><li><a href="index.html#join">Instructor Application Form</a></li><li><a href="about.html">About DriveSQ</a></li><li><a href="contact.html">Contact Us</a></li></ul></div><div class="col-md-4"><div class="f-head">Contact</div><ul class="f-list"><li><a href="{WA}" target="_blank" style="color:#25D366;font-weight:700"><i class="bi bi-whatsapp me-1"></i>WhatsApp &mdash; 07352 932003</a></li><li><a href="tel:+447352932003"><i class="bi bi-telephone me-1" style="color:var(--red)"></i>07352 932003</a></li><li style="font-size:.8rem"><i class="bi bi-geo-alt me-1" style="color:var(--red)"></i>Manchester, Greater Manchester</li></ul></div></div><div class="f-div d-flex flex-wrap justify-content-between align-items-center gap-2"><span style="font-size:.7rem">&copy; <span id="yr"></span> DriveSQ Driving School &middot; Manchester &middot; DVSA Approved</span></div></div></footer>
<div class="mob-cta"><div class="container"><div class="row g-2"><div class="col-5"><a href="{{wa_link}}" target="_blank" rel="nofollow noopener" class="btn btn-wa w-100 py-2" style="font-size:.86rem;justify-content:center;background:#25D366;color:#fff;border:none;border-radius:8px;display:flex;align-items:center;gap:6px"><i class="bi bi-whatsapp"></i>Apply</a></div><div class="col-4"><a href="index.html#join" class="btn w-100 py-2" style="font-size:.86rem;justify-content:center;background:var(--red);color:#fff;border:none;border-radius:8px;display:flex;align-items:center;gap:6px"><i class="bi bi-file-earmark-text"></i>Form</a></div><div class="col-3"><a href="tel:+447352932003" class="d-flex justify-content-center w-100 h-100 rounded-2" style="border:1.5px solid #333;color:#ccc;font-size:.86rem;text-decoration:none;align-items:center"><i class="bi bi-telephone"></i></a></div></div></div></div>'''

SCRIPT = '''<script defer src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script>document.getElementById('yr').textContent=new Date().getFullYear();if('IntersectionObserver'in window){const ro=new IntersectionObserver(e=>{e.forEach(x=>{if(x.isIntersecting){x.target.classList.add('visible');ro.unobserve(x.target);}});},{threshold:.08,rootMargin:'0px 0px -25px 0px'});document.querySelectorAll('.reveal').forEach(el=>ro.observe(el));}</script>
</body>
</html>'''


def build_join_page(data, all_slugs):
    slug = data['slug']
    filename = f'{slug}.html'
    url = f'https://www.drivesq.co.uk/{filename}'
    wa_link = f'{WA}?text=' + data['cta_wa_text'].replace(' ', '%20').replace('!', '%21').replace(',', '%2C').replace("'", '%27')

    title = f"{data['h1']} | DriveSQ"
    faqs = data['faqs']

    faq_schema = json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faqs
    ]})
    org_schema = json.dumps({"@context": "https://schema.org", "@type": "DrivingSchool", "name": "DriveSQ",
        "url": url, "telephone": "+447352932003", "logo": LOGO, "description": data['meta_desc'],
        "areaServed": ["Manchester", "Greater Manchester"],
        "address": {"@type": "PostalAddress", "addressLocality": "Manchester", "addressRegion": "Greater Manchester", "addressCountry": "GB"}})

    pain_html = ''.join(f'<li>{p}</li>' for p in data['pain_points'])
    skills_html = ''.join(f'<li>{s}</li>' for s in data['skills'])
    faq_html = ''.join(
        f'<div class="accordion-item border-0 mb-2"><h3 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#f{i}">{q}</button></h3><div id="f{i}" class="accordion-collapse collapse" data-bs-parent="#faqAcc"><div class="accordion-body" style="font-size:.88rem;color:#555">{a}</div></div></div>'
        for i, (q, a) in enumerate(faqs, 1)
    )

    # Deterministic set of 4 related pages (different from self), based on position in list
    idx = next(i for i, (s, a) in enumerate(all_slugs) if s == slug)
    related = [all_slugs[(idx + off) % len(all_slugs)] for off in (5, 9, 13, 17)]
    related_html = ''.join(f'<a href="{r[0]}.html" class="rel-link">{r[1]}</a>' for r in related)

    html = f'''<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{html_mod.escape(title)}</title>
<meta name="description" content="{html_mod.escape(data['meta_desc'])}"/>
<meta name="keywords" content="become a driving instructor Manchester, {data['audience'].lower()} driving instructor career, ADI training Manchester, PDI jobs Manchester"/>
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"/>
<link rel="canonical" href="{url}"/>
<meta property="og:site_name" content="DriveSQ Driving School Manchester"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="{html_mod.escape(title)}"/>
<meta property="og:description" content="{html_mod.escape(data['meta_desc'])}"/>
<meta property="og:image" content="{PASS_IMG}"/>
<meta property="og:url" content="{url}"/>
<meta property="og:locale" content="en_GB"/>
<meta name="twitter:card" content="summary_large_image"/>
<link rel="icon" type="image/png" href="{LOGO}"/>
<script type="application/ld+json">{org_schema}</script>
<script type="application/ld+json">{faq_schema}</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-CQP798G5TW"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','G-CQP798G5TW');</script>
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;1,700&display=swap" rel="stylesheet"/>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"/>
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet"/>
<style>{CSS}</style>
</head>
<body>
<div class="ann"><i class="bi bi-megaphone-fill"></i> DriveSQ is hiring ADIs &amp; PDIs across Greater Manchester <span class="sep">|</span> <a href="{WA}" target="_blank" rel="nofollow noopener"><i class="bi bi-whatsapp"></i> WhatsApp to apply</a></div>
{NAV}
<div class="bc"><div class="container"><a href="index.html">Home</a><span class="bc-sep">/</span><a href="become-driving-instructor-manchester.html">Become a Driving Instructor</a><span class="bc-sep">/</span>{data['audience']}</div></div>

<section class="hero-sm">
<div class="container">
<div class="badge-pill"><i class="bi bi-briefcase-fill"></i> {data['badge']}</div>
<h1>{data['h1']}</h1>
<p class="sub">{data['hero_sub']}</p>
<div class="d-flex flex-wrap"><span class="hp"><span class="dot"></span>No Franchise Fees</span><span class="hp"><span class="dot"></span>ADI &amp; PDI Welcome</span><span class="hp"><span class="dot"></span>Choose Your Own Hours</span><span class="hp"><span class="dot"></span>Manchester-Wide Pupils</span></div>
<div class="d-flex flex-wrap gap-2 mt-3">
<a href="{wa_link}" target="_blank" rel="nofollow noopener" class="btn-wa-lg"><i class="bi bi-whatsapp"></i> WhatsApp to Apply</a>
<a href="index.html#join" class="btn-red-lg"><i class="bi bi-file-earmark-text"></i> Full Application Form</a>
</div>
</div>
</section>

<section class="stats-bar">
<div class="container">
<div class="d-flex justify-content-around flex-wrap">
<div class="stat"><div class="stat-num">0</div><div class="stat-lbl">Franchise Fees</div></div><div class="stat-sep d-none d-md-block"></div><div class="stat"><div class="stat-num">&pound;35</div><div class="stat-lbl">Pupil Rate / Hour</div></div><div class="stat-sep d-none d-md-block"></div><div class="stat"><div class="stat-num">5.0<span class="tg">&#9733;</span></div><div class="stat-lbl">Google Rating</div></div><div class="stat-sep d-none d-md-block"></div><div class="stat"><div class="stat-num">Free</div><div class="stat-lbl">Portal &amp; App</div></div>
</div>
</div>
</section>

<section class="sw">
<div class="container py-5">
<div class="row g-4">
<div class="col-lg-8 prose">
<h2 class="mb-3">Why Your {data['audience']} Experience Is a <span class="tr">Head Start</span></h2>
<p>{data['intro']}</p>

<h3>The Reality of {data['audience']} Right Now</h3>
<ul>{pain_html}</ul>

<h3>Skills You Already Have</h3>
<ul>{skills_html}</ul>

<div class="quote-box"><p>&ldquo;{data['quote']}&rdquo;</p><cite>&mdash; {data['quote_name']}</cite></div>

<h3>The Path to Qualifying</h3>
<p>Becoming a fully qualified ADI means passing three DVSA stages: theory &amp; hazard perception, an enhanced practical driving test, and an instructional ability assessment. Many candidates work as a trainee PDI (pink badge) under supervision while completing the final stage, earning as they train. Read our <a href="become-driving-instructor-manchester.html">full guide to becoming a driving instructor in Manchester</a> for the complete breakdown of costs, timelines and requirements.</p>
</div>

<div class="col-lg-4">
<div class="hl-box mb-4"><h4><i class="bi bi-building-check me-1 tgr"></i>Why Instructors Choose DriveSQ</h4>
<ul><li>No franchise fees — keep what you earn</li>
<li>Guaranteed pupil supply, matched by area</li>
<li>Choose your own hours &amp; areas</li>
<li>Free instructor portal &amp; student app</li>
<li>Supportive, friendly management team</li></ul></div>
<div class="hl-box gold"><h4><i class="bi bi-clipboard-check me-1 tg"></i>ADI Quick Facts</h4>
<ul><li>Minimum age 21</li>
<li>Full licence held 3+ years</li>
<li>Clear DBS check required</li>
<li>Pass DVSA Parts 1, 2 &amp; 3</li>
<li>PDI (pink badge) route available while training</li></ul></div>
</div></div>
</div></section>

<section class="sg reveal">
<div class="container">
<span class="eye">How to Join</span>
<h2 class="sec-t">Three Simple <span class="tr">Steps</span></h2>
<div class="row g-3 mt-2">
<div class="col-md-4"><div class="tc"><div class="step-num">1</div><div class="tc-t">Apply</div><div class="tc-d">Send your details via WhatsApp or the application form — takes two minutes.</div></div></div>
<div class="col-md-4"><div class="tc"><div class="step-num">2</div><div class="tc-t">Quick Chat</div><div class="tc-d">We'll call to talk through your ADI/PDI status, areas &amp; availability.</div></div></div>
<div class="col-md-4"><div class="tc"><div class="step-num">3</div><div class="tc-t">Start Teaching</div><div class="tc-d">Get matched with pupils in your chosen areas and start on your terms.</div></div></div>
</div>
</div>
</section>

<section class="sw reveal">
<div class="container">
<span class="eye">Common Questions</span>
<h2 class="sec-t">Frequently Asked <span class="tr">Questions</span></h2>
<div class="accordion mt-4" id="faqAcc">
{faq_html}
</div>
</div>
</section>

<section class="sg reveal"><div class="container">
<span class="eye">Explore More</span>
<h2 class="sec-t" style="font-size:1.4rem">Other Career Paths Into <span class="tr">Driving Instruction</span></h2>
<div class="mt-3">{related_html}<a href="become-driving-instructor-manchester.html" class="rel-link" style="border-color:var(--red);color:var(--red)">Full ADI Career Guide</a></div>
</div></section>

<section class="cta-band reveal"><div class="container"><h2>Ready to Become a Driving Instructor?</h2><p>DriveSQ is actively hiring ADIs and PDIs across Greater Manchester. No franchise fees, guaranteed pupil supply, and a team that supports you from application to your first lesson.</p><div class="d-flex flex-wrap justify-content-center gap-2"><a href="{wa_link}" target="_blank" rel="nofollow noopener" class="btn-w" style="background:#fff;color:var(--red);padding:13px 30px;border-radius:999px;font-weight:700;display:inline-block;margin:5px;font-size:.95rem"><i class="bi bi-whatsapp me-2"></i>WhatsApp to Apply</a><a href="index.html#join" class="btn-w" style="background:#fff;color:var(--red);padding:13px 30px;border-radius:999px;font-weight:700;display:inline-block;margin:5px;font-size:.95rem"><i class="bi bi-file-earmark-text me-2"></i>Application Form</a></div></div></section>

{FOOTER.replace('{wa_link}', wa_link)}
{SCRIPT}'''

    return filename, html


count = 0
all_slugs = [(a['slug'], a['audience']) for a in AUDIENCES]
for data in AUDIENCES:
    filename, html = build_join_page(data, all_slugs)
    with open(filename, 'w') as f:
        f.write(html)
    count += 1
    print(f'{count}. {filename}')

