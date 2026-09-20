/** 気圧の変化に応じたセルフケアのアドバイスの文章（日本語 / English）。ブラウザ機能に依存しない */
import type { Lang } from './i18n/context.ts'

export interface AdviceItem {
  /** 見出し（太字で表示） */
  lead: string
  body: string
}

export interface AdviceSection {
  title: string
  intro?: string
  items: AdviceItem[]
}

export interface AdviceContent {
  /** 見出しと本文の間の区切り */
  separator: string
  falling: AdviceSection
  rising: AdviceSection
  /** 気圧が上がる時にも下がる時にも共通のセルフケア */
  common: AdviceSection
}

export const ADVICE: Record<Lang, AdviceContent> = {
  ja: {
    separator: '：',
    falling: {
      title: '📉 今後、気圧が「下降」する場合のアドバイス',
      intro:
        '雨が降る前や台風の接近時など、気圧が下がるときは血管が拡張しやすく、ズキズキと脈打つような「片頭痛」が起こりやすい傾向にあります。',
      items: [
        {
          lead: '冷やして血管を抑える',
          body: '頭の痛む部分（こめかみや首の後ろなど）を、冷たいタオルや保冷剤で冷やすと血管の拡張が抑えられ、痛みが和らぎやすくなります。',
        },
        {
          lead: '静かで暗い部屋で休む',
          body: '光や音の刺激を避けるため、部屋を暗くして静かな環境で横になってください。',
        },
        {
          lead: '入浴やマッサージは控える',
          body: '体を温めたり強いマッサージをしたりすると、血管がさらに広がって痛みが悪化することがあります（※ただし、痛む前の「予防」としての耳マッサージは有効です）。',
        },
        {
          lead: 'カフェインを適量摂る',
          body: 'コーヒーや緑茶に含まれるカフェインには血管を収縮させる作用があるため、初期の痛みに効果的な場合があります。',
        },
      ],
    },
    rising: {
      title: '📈 今後、気圧が「上昇」する場合のアドバイス',
      intro:
        '天気が回復するときや、高気圧が急速に張り出すときも頭痛は起こります。このときは交感神経が優位になりやすく、体が緊張して肩こりや頭を締め付けられるような「緊張型頭痛」が起こりやすくなります。',
      items: [
        {
          lead: '首や肩を温めてほぐす',
          body: 'ホットタオルや入浴などで首・肩まわりを温め、血行を良くして筋肉の緊張をほぐしましょう。',
        },
        {
          lead: 'ストレッチやリラックス',
          body: '軽いストレッチや深呼吸を行い、優位になりすぎた交感神経を落ち着かせ、自律神経のバランスを整えます。',
        },
        {
          lead: '水分をしっかり摂る',
          body: '体が緊張状態になると血流が滞りやすくなるため、こまめに水分（常温の水や温かい麦茶など）を摂取してください。',
        },
      ],
    },
    common: {
      title: '🔄 どちらの変化にも共通する「基本のセルフケア」',
      items: [
        {
          lead: '薬を飲むタイミング',
          body: '痛みが我慢できなくなる前の「あ、痛くなりそうだな」という早い段階（予兆期・初期）で鎮痛薬や医師から処方された薬を服用すると、効果が得られやすいです。',
        },
        {
          lead: '耳のマッサージ（予防として）',
          body: '気圧が大きく動く前に、両耳を軽く引っ張って上下横に動かしたり、ぐるぐると回したりすると、内耳の血流が良くなり自律神経が整いやすくなります。※痛みが激しい時は無理に行わないでください。',
        },
      ],
    },
  },
  en: {
    separator: ': ',
    falling: {
      title: '📉 Advice for when pressure is about to fall',
      intro:
        'When pressure drops, such as before rain or as a typhoon approaches, blood vessels tend to dilate, which makes throbbing "migraine"-type headaches more likely.',
      items: [
        {
          lead: 'Cool the painful area',
          body: 'Cooling the sore spot (temples, back of the neck, etc.) with a cold towel or an ice pack limits the widening of blood vessels and tends to ease the pain.',
        },
        {
          lead: 'Rest in a quiet, dark room',
          body: 'To avoid light and sound, darken the room and lie down somewhere quiet.',
        },
        {
          lead: 'Avoid baths and massage',
          body: 'Warming the body or strong massage can widen blood vessels further and make the pain worse. (Note: ear massage as a preventive measure before the pain starts is effective.)',
        },
        {
          lead: 'Have a moderate amount of caffeine',
          body: 'The caffeine in coffee and green tea constricts blood vessels, so it can help with early-stage pain.',
        },
      ],
    },
    rising: {
      title: '📈 Advice for when pressure is about to rise',
      intro:
        'Headaches can also occur when the weather clears or high pressure moves in quickly. The sympathetic nervous system tends to dominate and the body tenses up, making "tension-type headaches" with stiff shoulders and a tight band-like feeling around the head more likely.',
      items: [
        {
          lead: 'Warm and loosen your neck and shoulders',
          body: 'Warm the neck and shoulder area with a hot towel or a bath to improve circulation and relax tight muscles.',
        },
        {
          lead: 'Stretch and relax',
          body: 'Do light stretches and deep breaths to calm an overactive sympathetic nervous system and balance the autonomic nerves.',
        },
        {
          lead: 'Drink plenty of fluids',
          body: 'When the body is tense, blood flow tends to stagnate, so drink small amounts often (room-temperature water, warm barley tea, etc.).',
        },
      ],
    },
    common: {
      title: '🔄 Basic self-care for either change',
      items: [
        {
          lead: 'When to take medicine',
          body: 'Taking a painkiller or your prescribed medicine early — at the first "I think a headache is coming" stage (warning or early phase), before the pain becomes unbearable — tends to work better.',
        },
        {
          lead: 'Ear massage (as prevention)',
          body: 'Before pressure changes a lot, gently pull both ears and move them up, down and sideways, or rotate them. This improves blood flow in the inner ear and helps balance the autonomic nerves. Do not force it when the pain is severe.',
        },
      ],
    },
  },
}
