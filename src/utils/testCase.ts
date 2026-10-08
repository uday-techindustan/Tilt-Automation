export type TestCaseMetadata = {
  id: string;
  priority: 'P0' | 'P1' | 'P2';
  title: string;
};

export function logTestCase(meta: TestCaseMetadata): void {
  console.log(`[${meta.priority}] ${meta.id}: ${meta.title}`);
}
