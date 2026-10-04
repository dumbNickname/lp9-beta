export function otherMember(rel: { member_a: string; member_b: string }, userId: string): string {
  return rel.member_a === userId ? rel.member_b : rel.member_a;
}
