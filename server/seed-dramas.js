// Seed 120 dramas (10 per category) with correct UTF-8
const mysql = require('mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'drama_platform',
    charset: 'utf8mb4',
    charsetNumber: 45,
  });

  const genres = [
    { name: '霸总', icon: 'crown', titles: [
      ['霸道总裁爱上我', 'A cold-hearted billionaire CEO never believed in love until she walked into his life and turned his world upside down.', 'completed', 80],
      ['隐婚总裁', 'A secret marriage between a powerful CEO and a seemingly ordinary girl. When the truth comes out, nothing will ever be the same.', 'completed', 65],
      ['替嫁新娘', 'Forced to marry in her sister\'s place, she never expected the groom to be the most powerful man in the city.', 'completed', 72],
      ['闪婚老公是千亿大佬', 'A drunk night leads to an accidental marriage with a mysterious billionaire who hides his true identity.', 'ongoing', 90],
      ['天价宠妻', 'He paid one billion for her hand. Now she must navigate the dangerous world of the ultra-rich.', 'completed', 60],
      ['厉总的冲喜新娘', 'A marriage arranged to break a family curse becomes the most unexpected love story.', 'completed', 55],
      ['顾总的隐婚罪妻', 'She signed the divorce papers and left. But he never stopped searching for her.', 'ongoing', 78],
      ['离婚后霸总天天求复合', 'After divorce, the cold CEO realizes he can\'t live without her and will do anything to win her back.', 'completed', 50],
      ['千亿爹地超给力', 'A single mother discovers her child\'s father is the most powerful CEO in Asia.', 'completed', 68],
      ['傅少的冷面娇妻', 'A marriage of convenience between a frosty tycoon and a spirited young woman who refuses to be tamed.', 'ongoing', 85],
    ]},
    { name: '甜宠', icon: 'heart', titles: [
      ['偏偏宠爱', 'A pampered heiress falls for a humble teacher. Their love defies all odds and family expectations.', 'completed', 45],
      ['你比星光美丽', 'A famous actress and her bodyguard share a love that lights up even the darkest nights.', 'completed', 52],
      ['半是蜜糖半是伤', 'Twin sisters, one sweet and one bitter, both fall for the same man. Who will he choose?', 'completed', 48],
      ['致我们单纯的小美好', 'A childhood promise, years apart, and a reunion that rekindles a love that never truly faded.', 'completed', 40],
      ['月光变奏曲', 'By day, she\'s a proofreader. By night, she\'s a bestselling author under a pen name. He\'s her editor, and her biggest fan.', 'ongoing', 56],
      ['偷偷藏不住', 'She\'s had a crush on her brother\'s best friend since childhood. Now they\'re adults, and he\'s noticed her too.', 'completed', 38],
      ['你是我的城池营垒', 'A police officer and a doctor - their worlds collide in both chaos and romance.', 'completed', 42],
      ['我的巴比伦恋人', 'An ancient love spell accidentally summons a warrior from 3000 years ago into modern-day life.', 'completed', 35],
      ['双世宠妃', 'A modern girl wakes up in the body of an ancient princess and captures the heart of a ruthless prince.', 'completed', 44],
      ['韫色过浓', 'A renowned plastic surgeon and a rising star actress find love in the most unexpected circumstances.', 'completed', 46],
    ]},
    { name: '穿越', icon: 'time', titles: [
      ['穿越后我成了王妃', 'A modern woman time-travels to ancient China and must survive palace intrigue while winning the prince\'s heart.', 'completed', 70],
      ['回到古代当神医', 'A brilliant surgeon finds herself 500 years in the past, where her medical skills make her a legend.', 'completed', 65],
      ['我在古代搞事业', 'Transported to the Tang Dynasty, a businesswoman uses modern knowledge to build an empire.', 'ongoing', 58],
      ['将军夫人的穿越日记', 'A military strategist from the future must navigate ancient warfare and court politics.', 'completed', 62],
      ['重生之商业女王', 'Reborn in 1990 with memories of the future, she builds a business empire from nothing.', 'ongoing', 75],
      ['穿越之绝世医妃', 'A modern pharmacist becomes the most sought-after physician in the ancient world.', 'completed', 55],
      ['凤归四时歌', 'A princess returns from exile to reclaim her throne and uncover a conspiracy that spans decades.', 'completed', 48],
      ['我在大唐当首富', 'A stock trader wakes up in the Tang Dynasty and uses his knowledge to become the richest man alive.', 'completed', 50],
      ['双世宠妃第二季', 'The time-traveling couple faces new challenges as their love transcends lifetimes.', 'completed', 42],
      ['觉醒年代之我在民国', 'A history professor travels to Republican-era China and must navigate love and revolution.', 'ongoing', 60],
    ]},
    { name: '复仇', icon: 'fire', titles: [
      ['重生后我手撕渣男', 'Reborn after being betrayed and killed, she returns with a perfect plan to destroy everyone who wronged her.', 'completed', 80],
      ['千金归来', 'After her family is destroyed, the heiress returns with a new identity to reclaim everything.', 'completed', 65],
      ['黑暗荣耀', 'A victim of severe bullying spends decades planning her revenge against her tormentors.', 'completed', 52],
      ['凤凰于飞', 'A falsely accused noblewoman rises from ashes to take revenge on those who destroyed her family.', 'completed', 58],
      ['复仇女王的秘密', 'Behind every smile is a carefully crafted revenge plan that took years to perfect.', 'ongoing', 70],
      ['废柴逆天改命', 'Born without talent, she discovers a hidden power that changes everything.', 'completed', 62],
      ['逆袭千金', 'From rags to riches, from victim to victor. Her revenge will be served cold.', 'ongoing', 68],
      ['绝世千金', 'A girl from a poor village discovers she\'s the lost heir to a vast fortune.', 'completed', 45],
      ['顾少的复仇新娘', 'She married him for revenge. He married her for his own agenda. Neither expected love.', 'completed', 55],
      ['嫡女惊华', 'In ancient China, a discarded daughter returns to claim her rightful place and exact revenge.', 'completed', 60],
    ]},
    { name: '古装', icon: 'palace', titles: [
      ['长安十二时辰', 'A detective races against time to stop a conspiracy that could destroy the Tang Dynasty capital.', 'completed', 48],
      ['知否知否', 'A tale of family politics, marriage strategies, and quiet resilience in Song Dynasty China.', 'completed', 78],
      ['清平乐', 'The rise and reign of Emperor Renzong of Song, and the women who shaped his world.', 'completed', 70],
      ['甄嬛传之续', 'The sequel to the legendary harem drama continues with new alliances and betrayals.', 'ongoing', 65],
      ['锦绣未央', 'A princess in exile returns to the palace to uncover the truth behind her family\'s massacre.', 'completed', 54],
      ['延禧攻略', 'A clever palace maid rises through the ranks using wit and courage in the Forbidden City.', 'completed', 70],
      ['如懿传', 'The bitter love story of Emperor Qianlong and Empress Ruyi unfolds in the imperial harem.', 'completed', 87],
      ['皓镧传', 'From slave girl to queen, her journey through the Warring States period reshapes history.', 'completed', 62],
      ['梦回大清', 'A modern woman travels to the Qing Dynasty and falls into a love triangle with princes.', 'completed', 40],
      ['星汉灿烂', 'A young woman of uncertain parentage navigates love and politics in the Han Dynasty court.', 'completed', 55],
    ]},
    { name: '都市', icon: 'city', titles: [
      ['三十而已', 'Three women in their thirties face life-changing challenges in career, love, and self-discovery.', 'completed', 43],
      ['我的前半生', 'A full-time housewife must rebuild her life from scratch after her husband leaves her.', 'completed', 42],
      ['安家', 'The competitive world of real estate sales in Shanghai, where every deal is a battle.', 'completed', 53],
      ['都挺好', 'A family torn apart by a selfish father must find their way back to each other.', 'completed', 46],
      ['欢乐颂', 'Five young women from different backgrounds share an apartment and navigate life in the big city.', 'completed', 42],
      ['心居', 'Two sisters-in-law with opposing views on life and love in modern Shanghai.', 'completed', 35],
      ['理想之城', 'In the cutthroat construction industry, a young woman fights corruption with honesty and talent.', 'completed', 40],
      ['我在他乡挺好的', 'Four young professionals struggle and thrive in a city far from home.', 'completed', 36],
      ['乔家的儿女', 'Five siblings raised by a neglectful father support each other through decades of change.', 'completed', 56],
      [' neuher的荣耀', 'A washed-up e-sports champion returns to reclaim his glory with a new team.', 'ongoing', 45],
    ]},
    { name: '悬疑', icon: 'search', titles: [
      ['隐秘的角落', 'Three children stumble upon a murder while on vacation, triggering a dangerous chain of events.', 'completed', 12],
      ['沉默的真相', 'A prosecutor races to uncover the truth behind a case that has haunted him for decades.', 'completed', 12],
      ['白夜追凶', 'A disgraced detective and his twin brother hunt a serial killer while hiding a dark secret.', 'completed', 32],
      ['漫长的季节', 'A cold case from the 1990s resurfaces in a small industrial town, revealing buried truths.', 'completed', 12],
      ['消失的她', 'A man reports his wife missing on their honeymoon, but nothing is as it seems.', 'completed', 15],
      ['唐人街探案', 'A detective and his nephew solve mysterious cases in the Bangkok Chinatown.', 'completed', 20],
      ['法医秦明', 'A brilliant forensic examiner uses science to solve the most baffling murder cases.', 'completed', 30],
      ['重生之名流巨星', 'A famous actor is murdered and reborn in another body, determined to find his killer.', 'ongoing', 35],
      ['无证之罪', 'In a freezing northern city, a detective hunts a serial killer who leaves no evidence.', 'completed', 12],
      ['心跳源计划', 'A biomedical researcher uncovers a conspiracy that puts her life in danger.', 'completed', 40],
    ]},
    { name: '虐恋', icon: 'tear', titles: [
      ['东宫', 'A princess and a tribal prince fall in love, but duty and betrayal tear them apart.', 'completed', 55],
      ['花千骨', 'A girl becomes the disciple of a powerful immortal, but their forbidden love dooms them both.', 'completed', 50],
      ['香蜜沉沉烬如霜', 'A flower fairy and a fire god share a love that spans millennia, marked by tragedy.', 'completed', 63],
      ['三生三世十里桃花', 'Across three lifetimes, two celestial beings fight fate to be together.', 'completed', 58],
      ['琉璃', 'A demon princess and a disciple of a righteous sect must overcome their destiny to find love.', 'completed', 65],
      ['千古玦尘', 'The ruler of the universe falls in love with a mortal, triggering a catastrophe.', 'completed', 49],
      ['沉香如屑', 'A flower deity and a demon lord share a love that transcends their warring realms.', 'completed', 40],
      ['周生如故', 'A time-traveling love story where a modern woman must change the tragic fate of her ancient lover.', 'completed', 36],
      ['长月烬明', 'A girl is sent back in time to kill the demon lord before he destroys the world.', 'ongoing', 60],
      ['苍兰诀', 'A tiny orchid fairy accidentally binds her soul to the fearsome Moon Supreme.', 'completed', 36],
    ]},
    { name: '搞笑', icon: 'smile', titles: [
      ['赘婿', 'A modern man wakes up as a useless son-in-law in ancient times and uses business skills to change his fate.', 'completed', 36],
      ['我是余欢水', 'A loser who discovers he has terminal cancer suddenly finds the courage to live his best life.', 'completed', 12],
      ['万万没想到', 'A lowly guard in ancient China keeps accidentally saving the kingdom with absurd methods.', 'completed', 20],
      ['(report missing)', 'A confident con artist accidentally becomes the most trusted advisor in the imperial court.', 'completed', 25],
      ['我在大理寺当宠物', 'A modern girl transforms into a cat and must solve mysteries in ancient China.', 'completed', 24],
      ['炮灰攻略', 'Transported into a novel as a doomed side character, she must rewrite her fate.', 'completed', 30],
      ['报告王爷王妃又在装傻', 'A genius girl pretends to be foolish to survive in a dangerous royal household.', 'completed', 35],
      ['少爷你的马甲又掉了', 'Everyone thinks he\'s a useless rich kid, but he secretly runs a global empire.', 'ongoing', 40],
      ['我的老公是冥王', 'An accidental marriage to the King of the Underworld leads to hilarious adventures.', 'completed', 28],
      ['穿越之娇女的种田生活', 'A modern girl transmigrates to ancient times and becomes a farming sensation.', 'completed', 45],
    ]},
    { name: '逆袭', icon: 'rocket', titles: [
      ['全职高手之巅峰荣耀', 'A top gamer betrayed by his team rises from rock bottom to reclaim his championship.', 'completed', 40],
      ['奋斗吧少年', 'Underdogs fight their way to the national tennis championship against all odds.', 'completed', 35],
      ['旋风少女', 'A talented martial artist overcomes injury and self-doubt to become a champion.', 'completed', 32],
      ['燃烧的少年', 'A group of misfit teenagers form an esports team and take on the world.', 'ongoing', 38],
      ['致勇敢的你', 'After losing everything, a young woman rebuilds her life and becomes a successful entrepreneur.', 'completed', 30],
      ['逆流而上的你', 'A struggling actress fights through rejection and scandal to achieve her dreams.', 'completed', 42],
      ['蜗牛与黄鹂鸟', 'Two piano students from different backgrounds compete for the same dream.', 'completed', 36],
      ['扑通扑通喜欢你', 'A shy girl overcomes social anxiety to pursue her passion for music.', 'completed', 24],
      ['我才不要和你做朋友呢', 'A teenage girl travels back in time and becomes friends with her own mother.', 'completed', 24],
      ['站在你的角度看我', 'Through empathy and understanding, bitter enemies become the closest of friends.', 'completed', 30],
    ]},
    { name: '萌宝', icon: 'baby', titles: [
      ['萌宝神助攻', 'A clever toddler plays matchmaker to bring her single mom and handsome dad together.', 'completed', 35],
      ['天才萌宝', 'A child prodigy helps her mother navigate life while secretly searching for her father.', 'completed', 40],
      ['爹地请接招', 'Four adorable kids plot to reunite their parents in this heartwarming family comedy.', 'completed', 42],
      ['宝贝计划', 'A career woman unexpectedly becomes guardian of her sister\'s child and discovers the joy of family.', 'completed', 30],
      ['我的天才宝贝', 'A single dad and his genius daughter navigate life, love, and new beginnings.', 'ongoing', 38],
      ['萌娃来袭', 'A mysterious child appears at the CEO\'s door claiming to be his daughter, turning his life upside down.', 'completed', 45],
      ['奶爸的异界生活', 'A father and his baby daughter accidentally enter a fantasy world and must find their way home.', 'completed', 36],
      ['龙凤胎萌宝', 'Twin babies with opposite personalities create chaos and comedy in their parents\' lives.', 'completed', 32],
      ['超能萌宝', 'Children with mysterious superpowers must protect their family from dangerous enemies.', 'ongoing', 50],
      ['总裁的私藏萌宝', 'A CEO discovers he has a child from a past relationship and must confront his feelings.', 'completed', 48],
    ]},
  ];

  let count = 0;
  for (const genre of genres) {
    for (const [title, desc, status, eps] of genre.titles) {
      const seed = Math.floor(Math.random() * 9000) + 1000;
      const cover = `https://picsum.photos/seed/drama${seed}/300/450`;
      const [rows] = await pool.query(
        'INSERT INTO dramas (title, description, genre, status, episode_count, cover_image, view_count, like_count, collect_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [title, desc, genre.name, status, eps, cover, Math.floor(Math.random() * 50000), Math.floor(Math.random() * 5000), Math.floor(Math.random() * 3000)]
      );
      count++;
      if (count % 10 === 0) console.log(`Created ${count} dramas...`);
    }
  }
  
  console.log(`DONE! Total: ${count} dramas created`);
  
  // Verify
  const [result] = await pool.query('SELECT genre, COUNT(*) as cnt FROM dramas GROUP BY genre ORDER BY genre');
  console.log('\nGenre breakdown:');
  result.forEach(r => console.log(`  ${r.genre}: ${r.cnt} dramas`));
  
  const [total] = await pool.query('SELECT COUNT(*) as total FROM dramas');
  console.log(`\nTotal dramas: ${total[0].total}`);
  
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
