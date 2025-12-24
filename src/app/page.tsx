import clsx from "clsx";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-32">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-linear-to-r from-brand-500 to-pink-600 text-transparent bg-clip-text">
          공부로 하는 일본어가 즐거운 분이라면、
          <br />
          나가셔도 좋습니다。
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mb-12">
          국내 유일, 덕질로 독학할 수 있게 되는 강의 「오레노 니홍고。」가
          <br />
          오타쿠 여러분들이 듣는 마지막 강의가 될 것입니다.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <div>
            <Title content="📌 목차" size="h1" />
            <Content content="第一章) 자신의 길은 자신이 정한다。" />
            <Content content=" " />
            <Content content="01. 「오리엔테이션」" />
            <Content content="02. 「술은 좋아하나?」" />
            <Content content="03. 「일본어 실력이 늘지 않는 느낌이 든다고?」" />
            <Content content="04. 「MBTI는 E? 아니면 I?」" />
            <Content content="05. 「그럼, 최고의 인풋은 뭐야?」" />
            <Content content="06. 「일본어의 문자가 많은 이유, 알고 있니?」" />
            <Content content="07. 「도도토류 최고의 단어장。」" />
            <Content content="08. 「일본어의 '간지' 담당 한자。」" />
            <Content content="09. 「스스로 해결하지 못하는 사람이란, 섹시하지 않아。」" />
            <Content content="10. 「근본을 모르면, 평생 헛수고야。」" />
            <Content content="11. 「도도토가 선생님? 아니, 다르지。」" />
            <Content content="12. 「버벅인다니, 내가 하면 큐트할 뿐이지！- (1)」" />
            <Content content="13. 「버벅인다니, 내가 하면 큐트할 뿐이지！- (2)」" />
            <Content content="14. 「버벅인다니, 내가 하면 큐트할 뿐이지！- (3)」" />
            <Content content="15. 「평생 써먹을 수 있는 개념。」" />
            <Content content="- 「나의 휴식은 추진력을 얻기 위함！「１」 - 현지인들만 쓰는 용어를 배워보자" />

            <Content content="第二章) 문장이 뜯기는, 초고효율 액기스 기초문법。" />
            <Content content="01. 「그 첫 번째, 형용사。- (1)」" />
            <Content content="02. 「그 첫 번째, 형용사。- (2)」" />
            <Content content="03. 「그 두 번째, 동사。- (1)」" />
            <Content content="04. 「그 두 번째, 동사。- (2)」" />
            <Content content="05. 「그 두 번째, 동사。- (3)」" />
            <Content content="-「나의 휴식은 추진력을 얻기 위함！「２」 - 현지에서 쓰는 욕을 배워보자" />

            <Content content="第三章) 나만의 덕질。" />
            <Content content="01. 「J-POP！- (1)」" />
            <Content content="02. 「J-POP！- (2)」" />
            <Content content="03. 「ANIME！- (1)」" />
            <Content content="04. 「ANIME！- (2)」" />
            <Content content="05. 「ANIME！- (3)」" />
            <Content content="06. 「ANIME！- (4)」" />
            <Content content="07. 「ANIME！- (5)」" />
            <Content content="-「나의 휴식은 추진력을 얻기 위함！「３」 - 라인에서만 쓰는 용어를 배워보자" />

            <Content content="." />
            <Content content="." />
            <Content content="." />
            <Content content="「이렇게 커리큘럼이 끝납니다." />
            <Content content="「완벽한 커리큘럼이지만, 뭐라도 하나 더 해드리고 싶은 마음에" />
            <Content content="「특별한 수업 2개를 추가로 제공해드리고 있습니다." />
          </div>
        </div>
      </div>
    </main>
  );
}

const Title = ({ content, size }: { content: string; size: "h1" | "h2" | "h3" | "h4" }) => {
  const sizeClass = {
    h1: "text-5xl mb-6",
    h2: "text-4xl mb-5",
    h3: "text-3xl mb-4",
    h4: "text-2xl mb-3",
  };

  return (
    <div className={clsx(sizeClass[size], "text-center font-bold leading-relaxed")}>{content}</div>
  );
};

const Content = ({ content }: { content: string }) => {
  return (
    <div>
      <div className="text-2xl text-center mb-2 leading-relaxed">{content}</div>
    </div>
  );
};
