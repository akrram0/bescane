export interface ScannedDevTool {
    id: string;
    name: string;
    canonicalPath: string;
    version: string | null;
    diskUsageBytes: number;
    associatedCachePaths: string[];
    isVerifiedPath: boolean;
}
export interface Scanner {
    id: string;
    name: string;
    scan(): Promise<ScannedDevTool | null>;
}
//# sourceMappingURL=types.d.ts.map