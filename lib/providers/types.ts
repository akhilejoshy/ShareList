export interface ProviderCandidate {
  externalId: string;
  title: string;
  coverImageUrl: string | null;
  year: string | null;
  extra: Record<string, unknown>;
}

export interface ItemData {
  externalId: string;
  title: string;
  coverImageUrl: string | null;
  bannerUrl: string | null;
  metadata: Record<string, unknown>;
}

export interface MetadataProvider {
  search(query: string): Promise<ProviderCandidate[]>;
  getById(externalId: string): Promise<ItemData>;
}
