declare var mathjs: mathjs.MathJsStatic;

declare module mathjs {
    interface MathJsStatic {
        eval(expr: string): string;
    }
}

declare module "mathjs" {
    export = mathjs;
}
