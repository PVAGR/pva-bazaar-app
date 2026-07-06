/**
 * Narrative-Based Career Quiz Questions
 * Scenario-driven questions designed to reveal authentic career interests
 * Each question tells a story and invites genuine self-reflection
 */

const NARRATIVE_ENJOYMENT_QUESTIONS = [
  {
    id: 'q1',
    prompt:
      'You have 3 hours alone to fix something that\'s been broken for months. No one\'s watching, no deadline—just you and the problem. As you work, you get "in the zone," fully absorbed, gradually solving it piece by piece. How much does that scenario appeal to you?',
    axis: 'SN',
    scale: 'likert',
    section: 'enjoyment',
    weight: 1.2,
    lowPole: 'N',
    highPole: 'S',
    riasecLow: ['A', 'I'],
    riasecHigh: ['R', 'C'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'That sounds like my ideal afternoon.',
      },
      {
        key: '2',
        value: 2,
        text: "I'd enjoy parts of it, but I'd want someone to appreciate my work afterward.",
      },
      {
        key: '3',
        value: 3,
        text: "It's fine, but other things energize me more.",
      },
      {
        key: '4',
        value: 4,
        text: "I'd rather work on something bigger with implications.",
      },
      {
        key: '5',
        value: 5,
        text: 'Not my thing—I prefer group projects or something creative.',
      },
    ],
  },

  {
    id: 'q2',
    prompt:
      "You notice something doesn't quite add up. A pattern, a data inconsistency, a logical gap. You become obsessed with understanding *why*. You follow threads for weeks, hypothesize, refine your theory. Finally, all pieces click and you understand something most people are blind to. How alive does that moment feel?",
    axis: 'SN',
    scale: 'likert',
    section: 'enjoyment',
    weight: 1.2,
    lowPole: 'S',
    highPole: 'N',
    riasecLow: ['R', 'C'],
    riasecHigh: ['I', 'A'],
    options: [
      {
        key: '1',
        value: 1,
        text: "That's when I feel most alive. The chase matters as much as the answer.",
      },
      {
        key: '2',
        value: 2,
        text: 'I enjoy it, especially if the answer is practical and useful.',
      },
      {
        key: '3',
        value: 3,
        text: 'Depends on the context and whether I have time.',
      },
      {
        key: '4',
        value: 4,
        text: 'I can do it but would rather focus on real applications.',
      },
      {
        key: '5',
        value: 5,
        text: 'Not really—I prefer tangible tasks where results are immediate.',
      },
    ],
  },

  {
    id: 'q3',
    prompt:
      "You're creating something beautiful—whether design, writing, music, food, or space. Hours disappear. The creation is becoming real in the world through your hands and imagination. You see something that should exist and you're bringing it into being. Does that activate you?",
    axis: 'SN',
    scale: 'likert',
    section: 'enjoyment',
    weight: 1.2,
    lowPole: 'S',
    highPole: 'N',
    riasecLow: ['C', 'R'],
    riasecHigh: ['A', 'I'],
    options: [
      {
        key: '1',
        value: 1,
        text: "Absolutely. That's my element. I could do this every day.",
      },
      {
        key: '2',
        value: 2,
        text: "Yes, as long as it's for something meaningful.",
      },
      {
        key: '3',
        value: 3,
        text: 'Sometimes, but I need variety.',
      },
      {
        key: '4',
        value: 4,
        text: 'Not really. I prefer more practical work.',
      },
      {
        key: '5',
        value: 5,
        text: "I'd rather leave creation to specialists.",
      },
    ],
  },

  {
    id: 'q4',
    prompt:
      'A friend reaches out in crisis. You have limited time and energy, but you drop everything. Hours later, after really listening and reflecting back what you heard, they say, "You actually *get* it. I feel less alone." That moment—knowing you were truly understood them—stays with you for days. How fulfilling is that?',
    axis: 'TF',
    scale: 'likert',
    section: 'enjoyment',
    weight: 1.2,
    lowPole: 'T',
    highPole: 'F',
    riasecLow: ['I', 'C'],
    riasecHigh: ['S', 'E'],
    options: [
      {
        key: '1',
        value: 1,
        text: "It's the most meaningful thing I can do. Without those moments, my work feels hollow.",
      },
      {
        key: '2',
        value: 2,
        text: 'Very satisfying. Though I need time to recharge afterward.',
      },
      {
        key: '3',
        value: 3,
        text: "It's nice, but other things fulfill me more.",
      },
      {
        key: '4',
        value: 4,
        text: "I'd rather support people through expertise, not emotional conversations.",
      },
      {
        key: '5',
        value: 5,
        text: 'I prefer working alone or with clear, objective goals.',
      },
    ],
  },

  {
    id: 'q5',
    prompt:
      'A group is stuck, confused, moving in circles. You step in, analyze clearly, sense what needs to happen, propose the path forward with confidence. People follow not because they like you personally, but because your logic is sound and your certainty is evident. That moment of moving people from chaos to direction—does it energize you?',
    axis: 'EI',
    scale: 'likert',
    section: 'enjoyment',
    weight: 1.2,
    lowPole: 'I',
    highPole: 'E',
    riasecLow: ['I', 'C'],
    riasecHighI: ['E', 'S'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'Absolutely. I live for those moments. Mobilizing people around clear objectives is my sweet spot.',
      },
      {
        key: '2',
        value: 2,
        text: "Yes, but I'd want to do it with people I trust.",
      },
      {
        key: '3',
        value: 3,
        text: "It's satisfying in short bursts.",
      },
      {
        key: '4',
        value: 4,
        text: 'I can do it but would rather focus on my own work.',
      },
      {
        key: '5',
        value: 5,
        text: 'Not especially. I prefer quieter influence through expertise.',
      },
    ],
  },

  {
    id: 'q6',
    prompt:
      "You've created a system—a budget, a filing method, a schedule, a process—that works perfectly. New information arrives chaotic; you integrate it cleanly into your system; everything stays organized and predictable. Others find this tedious, but you find it satisfying. Is this you?",
    axis: 'JP',
    scale: 'likert',
    section: 'enjoyment',
    weight: 1.2,
    lowPole: 'P',
    highPole: 'J',
    riasecLow: ['A', 'E'],
    riasecHigh: ['C', 'E'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'Yes—I feel anxious when my systems break down. Maintaining order is calming.',
      },
      {
        key: '2',
        value: 2,
        text: 'Yes, mostly because disorganization creates problems later.',
      },
      {
        key: '3',
        value: 3,
        text: "Neutral. I maintain systems when necessary but don't enjoy it.",
      },
      {
        key: '4',
        value: 4,
        text: 'Not really. It feels like busywork.',
      },
      {
        key: '5',
        value: 5,
        text: 'I like designing new systems, not maintaining existing ones.',
      },
    ],
  },

  {
    id: 'q7',
    prompt:
      "You're outside—hiking, gardening, working with animals, or just in nature. Your attention is fully here: the smell of soil, the weight of a tool, the physics of movement, the feedback from the environment. Are you energized or drained by spending hours like this?",
    axis: 'EI',
    scale: 'likert',
    section: 'enjoyment',
    weight: 1.0,
    lowPole: 'I',
    highPole: 'E',
    riasecLow: ['I', 'C'],
    riasecHigh: ['R', 'E'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'Energized. This is where I come alive.',
      },
      {
        key: '2',
        value: 2,
        text: "Mostly energized, though I'd want to share it with someone.",
      },
      {
        key: '3',
        value: 3,
        text: "Neutral. It's fine.",
      },
      {
        key: '4',
        value: 4,
        text: 'Somewhat drained. Too much solitude.',
      },
      {
        key: '5',
        value: 5,
        text: "Very drained. I'd prefer being indoors with people or projects.",
      },
    ],
  },

  {
    id: 'q8',
    prompt:
      "You're deeply focused on one thing—reading, writing code, analyzing data, creating. Hours evaporate. You're in flow. No one interrupts; no meetings; just you and the work that demands all your attention. How necessary is this for your wellbeing?",
    axis: 'EI',
    scale: 'likert',
    section: 'enjoyment',
    weight: 1.0,
    lowPole: 'E',
    highPole: 'I',
    riasecLow: ['E', 'S'],
    riasecHigh: ['I', 'C'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'Essential. Without it, I become irritable and depleted.',
      },
      {
        key: '2',
        value: 2,
        text: 'Very important. I need significant alone/focus time.',
      },
      {
        key: '3',
        value: 3,
        text: 'I need some, but I balance it with people time.',
      },
      {
        key: '4',
        value: 4,
        text: 'I could work this way, but I prefer collaboration.',
      },
      {
        key: '5',
        value: 5,
        text: 'I get bored working alone. I need people around.',
      },
    ],
  },

  {
    id: 'q9',
    prompt:
      "You're in a room with new people, or a brainstorm with your core team. Ideas bounce back and forth. Energy is sparking. You're talking, building on what others said, the ideas are getting better and crazier in real time. Does this energize or drain you?",
    axis: 'EI',
    scale: 'likert',
    section: 'enjoyment',
    weight: 1.0,
    lowPole: 'I',
    highPole: 'E',
    riasecLow: ['I', 'C'],
    riasecHigh: ['E', 'A'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'Energizes me. I feel alive in that dynamic.',
      },
      {
        key: '2',
        value: 2,
        text: 'Energizing, at least for a while.',
      },
      {
        key: '3',
        value: 3,
        text: 'Depends on the people and topic.',
      },
      {
        key: '4',
        value: 4,
        text: 'Somewhat draining. I prefer smaller groups.',
      },
      {
        key: '5',
        value: 5,
        text: "Draining. I'd prefer thinking through things on my own first.",
      },
    ],
  },

  {
    id: 'q10',
    prompt:
      "You're working alone on a project you completely control—from concept to completion, your vision, your decisions, your pace. No meetings. No approval layers. Just you building something. How appealing is this?",
    axis: 'EI',
    scale: 'likert',
    section: 'enjoyment',
    weight: 1.0,
    lowPole: 'E',
    highPole: 'I',
    riasecLow: ['E', 'S'],
    riasecHigh: ['I', 'R'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'This is how I do my best work. Autonomy is essential.',
      },
      {
        key: '2',
        value: 2,
        text: 'I prefer it, though some collaboration is fine.',
      },
      {
        key: '3',
        value: 3,
        text: "I'm flexible. Solo or collaborative both work.",
      },
      {
        key: '4',
        value: 4,
        text: "I'd want collaboration and input from others.",
      },
      {
        key: '5',
        value: 5,
        text: "I'd feel isolated. I need my team around me.",
      },
    ],
  },

  {
    id: 'q11',
    prompt:
      'Someone presents an abstract concept—a theory, a future possibility, a philosophical idea. Your mind immediately starts connecting dots, extrapolating, imagining implications. You\'re fascinated by the "what if" and the big-picture meaning. Does this kind of thinking engage you?',
    axis: 'SN',
    scale: 'likert',
    section: 'enjoyment',
    weight: 1.1,
    lowPole: 'S',
    highPole: 'N',
    riasecLow: ['R', 'C'],
    riasecHigh: ['I', 'A'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'Absolutely. I love following ideas to their logical end.',
      },
      {
        key: '2',
        value: 2,
        text: 'Yes, as long as it has some practical application.',
      },
      {
        key: '3',
        value: 3,
        text: 'Sometimes. Depends on the idea.',
      },
      {
        key: '4',
        value: 4,
        text: 'I prefer concrete facts and real-world details.',
      },
      {
        key: '5',
        value: 5,
        text: 'Not really. Abstract thinking feels like a waste of time.',
      },
    ],
  },

  {
    id: 'q12',
    prompt:
      "You're facing a task with immediate, visible results. Fix it, produce it, complete it—and by end of day, there's tangible evidence of your work. How much does that appeal to you versus work with delayed or abstract payoff?",
    axis: 'SN',
    scale: 'likert',
    section: 'enjoyment',
    weight: 1.1,
    lowPole: 'N',
    highPole: 'S',
    riasecLow: ['A', 'I'],
    riasecHigh: ['R', 'C'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'Greatly. I need to see results. Abstract work frustrates me.',
      },
      {
        key: '2',
        value: 2,
        text: 'Appeals to me. I like progress I can point to.',
      },
      {
        key: '3',
        value: 3,
        text: "Neutral. I'm flexible on timeline.",
      },
      {
        key: '4',
        value: 4,
        text: "I'm okay with delayed results if the work is meaningful.",
      },
      {
        key: '5',
        value: 5,
        text: 'I prefer long-term strategic work over immediate tasks.',
      },
    ],
  },

  {
    id: 'q13',
    prompt:
      "Someone presents a problem with conflicting needs or values. A solution that's logically perfect might hurt someone emotionally. Another solution honors the person but costs efficiency. When you have to choose, what pulls at you more—the logic or the person?",
    axis: 'TF',
    scale: 'likert',
    section: 'enjoyment',
    weight: 1.1,
    lowPole: 'F',
    highPole: 'T',
    riasecLow: ['S', 'E'],
    riasecHigh: ['I', 'C'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'Logic wins. Hard truth is usually better than softening reality.',
      },
      {
        key: '2',
        value: 2,
        text: 'Logic mostly, but I try to communicate gently.',
      },
      {
        key: '3',
        value: 3,
        text: 'I weigh both equally. Context determines.',
      },
      {
        key: '4',
        value: 4,
        text: "The person matters more. I'll find a logical way that honors them.",
      },
      {
        key: '5',
        value: 5,
        text: 'Always the person. Efficiency without care is cruel.',
      },
    ],
  },

  {
    id: 'q14',
    prompt:
      'You\'re in a conflict. Someone is upset with you. You can either explain yourself logically (and you know you\'re right), or you can focus on understanding their pain first, even if it means not "winning" the argument. Which impulse is stronger?',
    axis: 'TF',
    scale: 'likert',
    section: 'enjoyment',
    weight: 1.1,
    lowPole: 'T',
    highPole: 'F',
    riasecLow: ['I', 'C'],
    riasecHigh: ['S', 'E'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'Explain first. Being right is important.',
      },
      {
        key: '2',
        value: 2,
        text: 'Explain, but try to acknowledge their feelings too.',
      },
      {
        key: '3',
        value: 3,
        text: 'I shift depending on the relationship and situation.',
      },
      {
        key: '4',
        value: 4,
        text: 'Understand their feelings first; explanation can come later.',
      },
      {
        key: '5',
        value: 5,
        text: 'Always understand first. Being right feels empty if the person feels dismissed.',
      },
    ],
  },

  {
    id: 'q15',
    prompt:
      "You have a clear plan for your day/week/year. You know what will happen and when. There's structure and predictability. Does this feel stabilizing or suffocating?",
    axis: 'JP',
    scale: 'likert',
    section: 'enjoyment',
    weight: 1.0,
    lowPole: 'P',
    highPole: 'J',
    riasecLow: ['A', 'E'],
    riasecHigh: ['C', 'E'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'Stabilizing. I feel grounded with structure.',
      },
      {
        key: '2',
        value: 2,
        text: 'Mostly stabilizing. Some spontaneity is okay though.',
      },
      {
        key: '3',
        value: 3,
        text: "Neutral. I'm flexible either way.",
      },
      {
        key: '4',
        value: 4,
        text: 'Somewhat suffocating. I like some room to improvise.',
      },
      {
        key: '5',
        value: 5,
        text: 'Suffocating. I need flexibility and spontaneity.',
      },
    ],
  },

  {
    id: 'q16',
    prompt:
      'Plans change. An opportunity appears unexpectedly. The schedule shifts. Surprise guests arrive. Your day is upended. Do you feel energized by the spontaneity or stressed by the disruption?',
    axis: 'JP',
    scale: 'likert',
    section: 'enjoyment',
    weight: 1.0,
    lowPole: 'J',
    highPole: 'P',
    riasecLow: ['C', 'E'],
    riasecHigh: ['E', 'A'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'Energized. Spontaneity is my element.',
      },
      {
        key: '2',
        value: 2,
        text: 'Mostly energized. I enjoy most surprises.',
      },
      {
        key: '3',
        value: 3,
        text: 'Neutral. Depends on the change.',
      },
      {
        key: '4',
        value: 4,
        text: "Somewhat stressed. I prefer knowing what's coming.",
      },
      {
        key: '5',
        value: 5,
        text: 'Stressed. Unpredictability makes me anxious.',
      },
    ],
  },

  {
    id: 'q17',
    prompt:
      "An opportunity to present your ideas, be in the spotlight, or have your work recognized publicly. You'd be on stage (literally or figuratively). Does that excite or terrify you?",
    axis: 'EI',
    scale: 'likert',
    section: 'enjoyment',
    weight: 1.0,
    lowPole: 'I',
    highPole: 'E',
    riasecLow: ['I', 'C'],
    riasecHigh: ['E', 'A'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'Excites me. I love the spotlight.',
      },
      {
        key: '2',
        value: 2,
        text: 'Mostly excited. Nervousness is part of it.',
      },
      {
        key: '3',
        value: 3,
        text: 'Mixed feelings. Could go either way.',
      },
      {
        key: '4',
        value: 4,
        text: "Somewhat terrifying. I'd do it but prefer being behind the scenes.",
      },
      {
        key: '5',
        value: 5,
        text: 'Terrifying. I avoid public exposure.',
      },
    ],
  },

  {
    id: 'q18',
    prompt:
      "Important work is happening, but no one knows your name or sees your contribution. You're behind the scenes. The work is valuable and important. How okay are you with that invisibility?",
    axis: 'EI',
    scale: 'likert',
    section: 'enjoyment',
    weight: 1.0,
    lowPole: 'E',
    highPole: 'I',
    riasecLow: ['E', 'A'],
    riasecHigh: ['I', 'C'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'Perfect. I prefer working invisibly.',
      },
      {
        key: '2',
        value: 2,
        text: "Okay with it. I don't need recognition.",
      },
      {
        key: '3',
        value: 3,
        text: 'Neutral. Depends on the work.',
      },
      {
        key: '4',
        value: 4,
        text: "Uncomfortable. I'd want my contribution acknowledged.",
      },
      {
        key: '5',
        value: 5,
        text: " Unacceptable. I'd feel unvalued.",
      },
    ],
  },

  {
    id: 'q19',
    prompt:
      'New technology, new methods, new tools keep emerging. Staying current means constant learning. Does the thought of mastering new tech invigorate you or stress you?',
    axis: 'SN',
    scale: 'likert',
    section: 'enjoyment',
    weight: 0.9,
    lowPole: 'S',
    highPole: 'N',
    riasecLow: ['C', 'S'],
    riasecHigh: ['I', 'R'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'Invigorating. New tech fascinates me.',
      },
      {
        key: '2',
        value: 2,
        text: 'Mostly invigorating. Though excess change stresses me.',
      },
      {
        key: '3',
        value: 3,
        text: "Neutral. I learn what's necessary.",
      },
      {
        key: '4',
        value: 4,
        text: 'Somewhat stressful. I prefer tried-and-true methods.',
      },
      {
        key: '5',
        value: 5,
        text: 'Very stressful. Constant change exhausts me.',
      },
    ],
  },

  {
    id: 'q20',
    prompt:
      "You're cultivating creativity—whether cooking, writing, designing, tinkering, or making something new. You have freedom to experiment and improvise. The final product is uniquely yours. How fulfilled does this make you?",
    axis: 'SN',
    scale: 'likert',
    section: 'enjoyment',
    weight: 1.0,
    lowPole: 'N',
    highPole: 'S',
    riasecLow: ['I', 'C'],
    riasecHigh: ['A', 'R'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'Deeply fulfilling. Creation is how I process and express.',
      },
      {
        key: '2',
        value: 2,
        text: 'Very fulfilling. I enjoy creative projects.',
      },
      {
        key: '3',
        value: 3,
        text: 'Somewhat fulfilling. But structure helps me too.',
      },
      {
        key: '4',
        value: 4,
        text: 'Not particularly. I prefer following clear instructions.',
      },
      {
        key: '5',
        value: 5,
        text: 'Not fulfilling. Open-ended creation feels chaotic.',
      },
    ],
  },

  {
    id: 'q21',
    prompt:
      "You're designing the layout, look, or experience of a space, website, product. You're thinking about beauty, efficiency, how it will feel to the person using it. You care about both the aesthetic and the function. Does this kind of design work appeal?",
    axis: 'SN',
    scale: 'likert',
    section: 'enjoyment',
    weight: 1.0,
    lowPole: 'S',
    highPole: 'N',
    riasecLow: ['C', 'R'],
    riasecHigh: ['A', 'I'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'Absolutely. Design thinking excites me.',
      },
      {
        key: '2',
        value: 2,
        text: 'Yes, though I also enjoy other kinds of work.',
      },
      {
        key: '3',
        value: 3,
        text: "Somewhat. It's not my primary interest.",
      },
      {
        key: '4',
        value: 4,
        text: 'Not really. Let someone else handle the design.',
      },
      {
        key: '5',
        value: 5,
        text: 'Not at all. Too abstract for me.',
      },
    ],
  },

  {
    id: 'q22',
    prompt:
      "You're working with numbers—budgets, data, statistics, financial planning. You're analyzing trends, spotting patterns, ensuring accuracy. This kind of detailed, technical financial work is what's in front of you. How does it sit with you?",
    axis: 'TF',
    scale: 'likert',
    section: 'enjoyment',
    weight: 0.9,
    lowPole: 'F',
    highPole: 'T',
    riasecLow: ['A', 'S'],
    riasecHigh: ['C', 'I'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'Love it. Numbers are where I think best.',
      },
      {
        key: '2',
        value: 2,
        text: 'I enjoy financial analysis.',
      },
      {
        key: '3',
        value: 3,
        text: "I can do it, but it's not my favorite.",
      },
      {
        key: '4',
        value: 4,
        text: "Not my strength. I'd prefer other work.",
      },
      {
        key: '5',
        value: 5,
        text: 'Numbers drain me. Anything but accounting.',
      },
    ],
  },

  {
    id: 'q23',
    prompt:
      "You're investigating, experimenting, conducting research. The scientific process fascinates you. You're testing hypotheses, collecting data, trying to understand how something works at the deepest level. Does this energize you?",
    axis: 'SN',
    scale: 'likert',
    section: 'enjoyment',
    weight: 1.0,
    lowPole: 'S',
    highPole: 'N',
    riasecLow: ['R', 'C'],
    riasecHigh: ['I', 'A'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'Absolutely. Scientific inquiry is my element.',
      },
      {
        key: '2',
        value: 2,
        text: 'Yes, I enjoy research and experimentation.',
      },
      {
        key: '3',
        value: 3,
        text: "Somewhat. It's interesting but not my main drive.",
      },
      {
        key: '4',
        value: 4,
        text: 'Not particularly. Too much abstract theory.',
      },
      {
        key: '5',
        value: 5,
        text: 'Not at all. Give me practical application over research.',
      },
    ],
  },

  {
    id: 'q24',
    prompt:
      "You're telling a story—through writing, conversation, performance, or narrative. You're drawing people into a world, invoking emotion, creating meaning through language or imagery. Does this kind of storytelling work feed your soul?",
    axis: 'SN',
    scale: 'likert',
    section: 'enjoyment',
    weight: 0.9,
    lowPole: 'S',
    highPole: 'N',
    riasecLow: ['C', 'R'],
    riasecHigh: ['A', 'I'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'Absolutely. Storytelling is profound work.',
      },
      {
        key: '2',
        value: 2,
        text: 'Yes, I love it.',
      },
      {
        key: '3',
        value: 3,
        text: 'I enjoy it sometimes.',
      },
      {
        key: '4',
        value: 4,
        text: 'Not really. I prefer factual communication.',
      },
      {
        key: '5',
        value: 5,
        text: 'Not at all. Narrative feels like manipulation.',
      },
    ],
  },

  {
    id: 'q25',
    prompt:
      "You're mentoring or coaching someone. You're helping them see their own strength and agency. You're asking questions that catalyze their growth. They come back months later and tell you how your guidance changed something. Does this work fulfill you?",
    axis: 'TF',
    scale: 'likert',
    section: 'enjoyment',
    weight: 1.0,
    lowPole: 'T',
    highPole: 'F',
    riasecLow: ['I', 'C'],
    riasecHigh: ['S', 'E'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'Deeply. Helping people grow is my calling.',
      },
      {
        key: '2',
        value: 2,
        text: 'Very fulfilling. I love mentoring.',
      },
      {
        key: '3',
        value: 3,
        text: "Fulfilling, but it's not my primary focus.",
      },
      {
        key: '4',
        value: 4,
        text: 'Not particularly. I prefer task work.',
      },
      {
        key: '5',
        value: 5,
        text: "Not fulfilling. I'm not good at people development.",
      },
    ],
  },

  {
    id: 'q26',
    prompt:
      "You're negotiating, persuading, making the sale, or moving people to action. You're using logic and charm to align others around your vision. You're closing deals or securing buy-in. Does this activate you?",
    axis: 'EI',
    scale: 'likert',
    section: 'enjoyment',
    weight: 1.0,
    lowPole: 'I',
    highPole: 'E',
    riasecLow: ['I', 'C'],
    riasecHigh: ['E', 'S'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'Absolutely. Persuasion and deal-making energize me.',
      },
      {
        key: '2',
        value: 2,
        text: 'Yes, I enjoy negotiation.',
      },
      {
        key: '3',
        value: 3,
        text: 'I can do it. Neutral on it.',
      },
      {
        key: '4',
        value: 4,
        text: 'Not really. I prefer consensus or collaboration.',
      },
      {
        key: '5',
        value: 5,
        text: 'Not at all. Persuasion feels manipulative.',
      },
    ],
  },

  {
    id: 'q27',
    prompt:
      'Your job involves maintaining records, following procedure, ensuring compliance, handling repetitive but important detail work. No major changes, just steady execution of known processes. How bearable is this?',
    axis: 'JP',
    scale: 'likert',
    section: 'enjoyment',
    weight: 0.8,
    lowPole: 'P',
    highPole: 'J',
    riasecLow: ['A', 'E'],
    riasecHigh: ['C', 'E'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'I can stay engaged in this for hours. Satisfying.',
      },
      {
        key: '2',
        value: 2,
        text: "I can do it. It's boring but necessary.",
      },
      {
        key: '3',
        value: 3,
        text: "Neutral. I'd mix it with more interesting work.",
      },
      {
        key: '4',
        value: 4,
        text: "Somewhat draining. I'd want more variety.",
      },
      {
        key: '5',
        value: 5,
        text: "Unbearable. I'd go crazy with repetition.",
      },
    ],
  },

  {
    id: 'q28',
    prompt:
      'Opportunity to travel to new places, experience different cultures, try new things, improvise your way through novelty. Predictability is gone; spontaneity is constant. How alive does this feel?',
    axis: 'JP',
    scale: 'likert',
    section: 'enjoyment',
    weight: 0.9,
    lowPole: 'J',
    highPole: 'P',
    riasecLow: ['C', 'I'],
    riasecHigh: ['E', 'A'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'Alive and energized. Adventure is my element.',
      },
      {
        key: '2',
        value: 2,
        text: 'Very appealing. I like novelty.',
      },
      {
        key: '3',
        value: 3,
        text: "Appealing, but I'd want some structure.",
      },
      {
        key: '4',
        value: 4,
        text: "Somewhat stressful. I'd prefer predictability.",
      },
      {
        key: '5',
        value: 5,
        text: 'Chaotic and anxiety-inducing.',
      },
    ],
  },

  {
    id: 'q29',
    prompt:
      "You're solving a stubborn technical problem. The system is broken; you diagnose it; you implement a fix; the system works again. The debugging process fascinates you—understanding the cause, trying approaches, getting closer to the solution. How engaged are you?",
    axis: 'SN',
    scale: 'likert',
    section: 'enjoyment',
    weight: 0.9,
    lowPole: 'N',
    highPole: 'S',
    riasecLow: ['A', 'S'],
    riasecHigh: ['R', 'I'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'Deeply engaged. Problem-solving is my element.',
      },
      {
        key: '2',
        value: 2,
        text: 'Very engaged. I like technical challenges.',
      },
      {
        key: '3',
        value: 3,
        text: 'Engaged, but I need variety too.',
      },
      {
        key: '4',
        value: 4,
        text: "Not particularly. It's frustrating.",
      },
      {
        key: '5',
        value: 5,
        text: 'Not at all. Troubleshooting exhausts me.',
      },
    ],
  },

  {
    id: 'q30',
    prompt:
      "Quiet time. Reading. Journaling. Meditating. Walking alone. Thinking deeply. No external input, no stimulation, just your own mind. This kind of internal reflection is what's available. Does it restore you or make you antsy?",
    axis: 'EI',
    scale: 'likert',
    section: 'enjoyment',
    weight: 0.9,
    lowPole: 'E',
    highPole: 'I',
    riasecLow: ['E', 'S'],
    riasecHigh: ['I', 'A'],
    options: [
      {
        key: '1',
        value: 1,
        text: 'Restores me deeply. I need this.',
      },
      {
        key: '2',
        value: 2,
        text: 'Restoring. I cherish quiet time.',
      },
      {
        key: '3',
        value: 3,
        text: 'I appreciate it, but I also need people time.',
      },
      {
        key: '4',
        value: 4,
        text: 'Makes me a bit antsy. I prefer activity or company.',
      },
      {
        key: '5',
        value: 5,
        text: 'Very antsy. I need external stimulation.',
      },
    ],
  },
];

const INTROSPECTION_QUESTIONS = [
  {
    id: 'i1',
    prompt:
      'You just finished an intense week of work or socializing. To recharge, you naturally drift toward: being around people and activity, or solitude and quiet? Which restores you?',
    axis: 'EI',
    scale: 'likert',
    section: 'introspection',
    weight: 1.0,
    lowPole: 'I',
    highPole: 'E',
    riasecLow: ['I', 'C'],
    riasecHigh: ['E', 'S'],
    options: [
      { key: '1', value: 1, text: 'People and activity. Solitude drains me.' },
      { key: '2', value: 2, text: 'Mostly people, but I need some down time.' },
      { key: '3', value: 3, text: 'Depends on the week and my mood.' },
      { key: '4', value: 4, text: 'Solitude, but some people time is okay.' },
      { key: '5', value: 5, text: 'Solitude. People drain me.' },
    ],
  },

  {
    id: 'i2',
    prompt:
      'You walk into a room of strangers. Your natural impulse is to: introduce yourself, or observe quietly first?',
    axis: 'EI',
    scale: 'likert',
    section: 'introspection',
    weight: 0.9,
    lowPole: 'I',
    highPole: 'E',
    riasecLow: ['I', 'C'],
    riasecHigh: ['E', 'S'],
    options: [
      { key: '1', value: 1, text: 'Introduce myself immediately.' },
      { key: '2', value: 2, text: 'Introduce myself fairly quickly.' },
      { key: '3', value: 3, text: 'Depends on the situation.' },
      { key: '4', value: 4, text: 'Observe first, then maybe introduce myself.' },
      {
        key: '5',
        value: 5,
        text: 'Stay quiet. Let others approach if interested.',
      },
    ],
  },

  {
    id: 'i3',
    prompt:
      'When walking into a room full of strangers, you naturally introduce yourself instead of observing quietly first.',
    axis: 'EI',
    scale: 'likert',
    section: 'introspection',
    weight: 0.9,
    lowPole: 'I',
    highPole: 'E',
    riasecLow: ['I', 'C'],
    riasecHigh: ['E', 'S'],
    options: [
      { key: '1', value: 1, text: 'Completely true.' },
      { key: '2', value: 2, text: 'Mostly true.' },
      { key: '3', value: 3, text: 'Neutral.' },
      { key: '4', value: 4, text: 'Mostly false.' },
      { key: '5', value: 5, text: 'Not true at all.' },
    ],
  },

  {
    id: 'i4',
    prompt:
      'You feel most alive when teaching or guiding others rather than mastering skills alone.',
    axis: 'EI',
    scale: 'likert',
    section: 'introspection',
    weight: 0.9,
    lowPole: 'I',
    highPole: 'E',
    riasecLow: ['I', 'R'],
    riasecHigh: ['S', 'E'],
    options: [
      { key: '1', value: 1, text: 'Completely true.' },
      { key: '2', value: 2, text: 'Mostly true.' },
      { key: '3', value: 3, text: 'Neutral.' },
      { key: '4', value: 4, text: 'Mostly false.' },
      { key: '5', value: 5, text: 'Not true at all.' },
    ],
  },

  {
    id: 'i5',
    prompt:
      'When you have a breakthrough idea, you talk it out quickly rather than processing it internally first.',
    axis: 'EI',
    scale: 'likert',
    section: 'introspection',
    weight: 0.8,
    lowPole: 'I',
    highPole: 'E',
    riasecLow: ['I', 'A'],
    riasecHigh: ['E', 'A'],
    options: [
      { key: '1', value: 1, text: 'Completely true.' },
      { key: '2', value: 2, text: 'Mostly true.' },
      { key: '3', value: 3, text: 'Neutral.' },
      { key: '4', value: 4, text: 'Mostly false.' },
      { key: '5', value: 5, text: 'Not true at all.' },
    ],
  },

  {
    id: 'i6',
    prompt:
      'In teams, you naturally drive conversation instead of listening quietly before speaking.',
    axis: 'EI',
    scale: 'likert',
    section: 'introspection',
    weight: 0.8,
    lowPole: 'I',
    highPole: 'E',
    riasecLow: ['I', 'C'],
    riasecHigh: ['E', 'S'],
    options: [
      { key: '1', value: 1, text: 'Completely true.' },
      { key: '2', value: 2, text: 'Mostly true.' },
      { key: '3', value: 3, text: 'Neutral.' },
      { key: '4', value: 4, text: 'Mostly false.' },
      { key: '5', value: 5, text: 'Not true at all.' },
    ],
  },

  {
    id: 'i7',
    prompt:
      'When learning something new, you prefer step-by-step instructions over high-level theory.',
    axis: 'SN',
    scale: 'likert',
    section: 'introspection',
    weight: 0.9,
    lowPole: 'N',
    highPole: 'S',
    riasecLow: ['I', 'A'],
    riasecHigh: ['R', 'C'],
    options: [
      { key: '1', value: 1, text: 'Completely true.' },
      { key: '2', value: 2, text: 'Mostly true.' },
      { key: '3', value: 3, text: 'Neutral.' },
      { key: '4', value: 4, text: 'Mostly false.' },
      { key: '5', value: 5, text: 'Not true at all.' },
    ],
  },

  {
    id: 'i8',
    prompt:
      'You are more satisfied fixing tangible objects than solving abstract conceptual puzzles.',
    axis: 'SN',
    scale: 'likert',
    section: 'introspection',
    weight: 0.9,
    lowPole: 'N',
    highPole: 'S',
    riasecLow: ['I', 'A'],
    riasecHigh: ['R', 'C'],
    options: [
      { key: '1', value: 1, text: 'Completely true.' },
      { key: '2', value: 2, text: 'Mostly true.' },
      { key: '3', value: 3, text: 'Neutral.' },
      { key: '4', value: 4, text: 'Mostly false.' },
      { key: '5', value: 5, text: 'Not true at all.' },
    ],
  },

  {
    id: 'i9',
    prompt: 'You trust proven methods more than intuitive hunches about future possibilities.',
    axis: 'SN',
    scale: 'likert',
    section: 'introspection',
    weight: 0.9,
    lowPole: 'N',
    highPole: 'S',
    riasecLow: ['A', 'I'],
    riasecHigh: ['C', 'R'],
    options: [
      { key: '1', value: 1, text: 'Completely true.' },
      { key: '2', value: 2, text: 'Mostly true.' },
      { key: '3', value: 3, text: 'Neutral.' },
      { key: '4', value: 4, text: 'Mostly false.' },
      { key: '5', value: 5, text: 'Not true at all.' },
    ],
  },

  {
    id: 'i10',
    prompt:
      'When describing a scene, you focus more on specific details than symbolic meaning and patterns.',
    axis: 'SN',
    scale: 'likert',
    section: 'introspection',
    weight: 0.8,
    lowPole: 'N',
    highPole: 'S',
    riasecLow: ['A', 'I'],
    riasecHigh: ['C', 'R'],
    options: [
      { key: '1', value: 1, text: 'Completely true.' },
      { key: '2', value: 2, text: 'Mostly true.' },
      { key: '3', value: 3, text: 'Neutral.' },
      { key: '4', value: 4, text: 'Mostly false.' },
      { key: '5', value: 5, text: 'Not true at all.' },
    ],
  },

  {
    id: 'i11',
    prompt:
      'You prefer work with immediate visible results over work that builds long-term visions.',
    axis: 'SN',
    scale: 'likert',
    section: 'introspection',
    weight: 0.8,
    lowPole: 'N',
    highPole: 'S',
    riasecLow: ['A', 'I'],
    riasecHigh: ['R', 'C'],
    options: [
      { key: '1', value: 1, text: 'Completely true.' },
      { key: '2', value: 2, text: 'Mostly true.' },
      { key: '3', value: 3, text: 'Neutral.' },
      { key: '4', value: 4, text: 'Mostly false.' },
      { key: '5', value: 5, text: 'Not true at all.' },
    ],
  },

  {
    id: 'i12',
    prompt:
      'When making decisions, logical efficiency matters more to you than emotional alignment.',
    axis: 'TF',
    scale: 'likert',
    section: 'introspection',
    weight: 0.9,
    lowPole: 'F',
    highPole: 'T',
    riasecLow: ['S', 'E'],
    riasecHigh: ['I', 'C'],
    options: [
      { key: '1', value: 1, text: 'Completely true.' },
      { key: '2', value: 2, text: 'Mostly true.' },
      { key: '3', value: 3, text: 'Neutral.' },
      { key: '4', value: 4, text: 'Mostly false.' },
      { key: '5', value: 5, text: 'Not true at all.' },
    ],
  },

  {
    id: 'i13',
    prompt:
      'When a friend shares a problem, your first instinct is to offer practical solutions rather than emotional validation.',
    axis: 'TF',
    scale: 'likert',
    section: 'introspection',
    weight: 0.9,
    lowPole: 'F',
    highPole: 'T',
    riasecLow: ['S', 'E'],
    riasecHigh: ['I', 'C'],
    options: [
      { key: '1', value: 1, text: 'Completely true.' },
      { key: '2', value: 2, text: 'Mostly true.' },
      { key: '3', value: 3, text: 'Neutral.' },
      { key: '4', value: 4, text: 'Mostly false.' },
      { key: '5', value: 5, text: 'Not true at all.' },
    ],
  },

  {
    id: 'i14',
    prompt: 'You believe hard truth is usually better than softening reality to avoid discomfort.',
    axis: 'TF',
    scale: 'likert',
    section: 'introspection',
    weight: 0.8,
    lowPole: 'F',
    highPole: 'T',
    riasecLow: ['S', 'E'],
    riasecHigh: ['I', 'C'],
    options: [
      { key: '1', value: 1, text: 'Completely true.' },
      { key: '2', value: 2, text: 'Mostly true.' },
      { key: '3', value: 3, text: 'Neutral.' },
      { key: '4', value: 4, text: 'Mostly false.' },
      { key: '5', value: 5, text: 'Not true at all.' },
    ],
  },

  {
    id: 'i15',
    prompt: 'In conflicts, being factually right is more important to you than preserving harmony.',
    axis: 'TF',
    scale: 'likert',
    section: 'introspection',
    weight: 0.8,
    lowPole: 'F',
    highPole: 'T',
    riasecLow: ['S', 'E'],
    riasecHigh: ['I', 'C'],
    options: [
      { key: '1', value: 1, text: 'Completely true.' },
      { key: '2', value: 2, text: 'Mostly true.' },
      { key: '3', value: 3, text: 'Neutral.' },
      { key: '4', value: 4, text: 'Mostly false.' },
      { key: '5', value: 5, text: 'Not true at all.' },
    ],
  },

  {
    id: 'i16',
    prompt:
      'When evaluating careers, challenge and measurable payoff matter more than meaning and service.',
    axis: 'TF',
    scale: 'likert',
    section: 'introspection',
    weight: 0.8,
    lowPole: 'F',
    highPole: 'T',
    riasecLow: ['S', 'E'],
    riasecHigh: ['I', 'C'],
    options: [
      { key: '1', value: 1, text: 'Completely true.' },
      { key: '2', value: 2, text: 'Mostly true.' },
      { key: '3', value: 3, text: 'Neutral.' },
      { key: '4', value: 4, text: 'Mostly false.' },
      { key: '5', value: 5, text: 'Not true at all.' },
    ],
  },

  {
    id: 'i17',
    prompt: 'You feel most relaxed when plans are set well in advance rather than open-ended.',
    axis: 'JP',
    scale: 'likert',
    section: 'introspection',
    weight: 0.9,
    lowPole: 'P',
    highPole: 'J',
    riasecLow: ['E', 'A'],
    riasecHigh: ['C', 'E'],
    options: [
      { key: '1', value: 1, text: 'Completely true.' },
      { key: '2', value: 2, text: 'Mostly true.' },
      { key: '3', value: 3, text: 'Neutral.' },
      { key: '4', value: 4, text: 'Mostly false.' },
      { key: '5', value: 5, text: 'Not true at all.' },
    ],
  },

  {
    id: 'i18',
    prompt: 'You prefer finishing projects early over working close to the deadline.',
    axis: 'JP',
    scale: 'likert',
    section: 'introspection',
    weight: 0.9,
    lowPole: 'P',
    highPole: 'J',
    riasecLow: ['E', 'A'],
    riasecHigh: ['C', 'E'],
    options: [
      { key: '1', value: 1, text: 'Completely true.' },
      { key: '2', value: 2, text: 'Mostly true.' },
      { key: '3', value: 3, text: 'Neutral.' },
      { key: '4', value: 4, text: 'Mostly false.' },
      { key: '5', value: 5, text: 'Not true at all.' },
    ],
  },

  {
    id: 'i19',
    prompt: 'Your workspace is naturally organized rather than comfortably cluttered.',
    axis: 'JP',
    scale: 'likert',
    section: 'introspection',
    weight: 0.8,
    lowPole: 'P',
    highPole: 'J',
    riasecLow: ['A', 'E'],
    riasecHigh: ['C', 'E'],
    options: [
      { key: '1', value: 1, text: 'Completely true.' },
      { key: '2', value: 2, text: 'Mostly true.' },
      { key: '3', value: 3, text: 'Neutral.' },
      { key: '4', value: 4, text: 'Mostly false.' },
      { key: '5', value: 5, text: 'Not true at all.' },
    ],
  },

  {
    id: 'i20',
    prompt: 'You tend to make decisions quickly instead of continuing to gather more information.',
    axis: 'JP',
    scale: 'likert',
    section: 'introspection',
    weight: 0.8,
    lowPole: 'P',
    highPole: 'J',
    riasecLow: ['I', 'A'],
    riasecHigh: ['E', 'C'],
    options: [
      { key: '1', value: 1, text: 'Completely true.' },
      { key: '2', value: 2, text: 'Mostly true.' },
      { key: '3', value: 3, text: 'Neutral.' },
      { key: '4', value: 4, text: 'Mostly false.' },
      { key: '5', value: 5, text: 'Not true at all.' },
    ],
  },
];

const DEFAULT_NARRATIVE_QUESTIONS = [...NARRATIVE_ENJOYMENT_QUESTIONS, ...INTROSPECTION_QUESTIONS];

module.exports = {
  NARRATIVE_ENJOYMENT_QUESTIONS,
  INTROSPECTION_QUESTIONS,
  DEFAULT_NARRATIVE_QUESTIONS,
};
