export interface MediaStorageSPI {
    /**
     * Join path segments using platform specific separator
     * @param parts
     */
    join(...parts: string[]): string;

    /**
     * Get list of directory items
     * @param dirPath
     */
    readDir(dirPath: string): Promise<Array<{
        name: string;
        size: number;
        isDir: boolean;
    }>>;

    /**
     * Read raw file as buffer
     * @param filePath
     */
    readFile(filePath: string): Promise<Buffer>;

    /**
     * Get item type
     * @param itemPath
     */
    type(itemPath: string): Promise<"file" | "dir" | "error" | "unknown">;
}
