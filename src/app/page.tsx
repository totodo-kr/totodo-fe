import { createClient } from "@/utils/supabase/server";
import BlockRenderer from "@/components/blocks/BlockRenderer";
import type { PageBlock } from "@/types/blocks";

export const revalidate = 60;

export default async function Home() {
  const supabase = await createClient();
  const { data: blocks } = await supabase
    .from("page_blocks")
    .select("*")
    .eq("page_key", "home")
    .eq("is_visible", true)
    .order("order_index", { ascending: true });

  const pageBlocks = (blocks ?? []) as PageBlock[];

  return (
    <main className="min-h-screen bg-black text-white">
      {pageBlocks.length === 0 ? (
        <div className="flex items-center justify-center min-h-screen text-gray-600 text-sm">
          아직 등록된 컨텐츠가 없습니다.
        </div>
      ) : (
        <div className="flex flex-col">
          {pageBlocks.map((block) => (
            <section key={block.id} className="w-full px-4 py-6 max-w-4xl mx-auto">
              <BlockRenderer block={block} />
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
