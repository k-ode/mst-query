import { destroy, IAnyModelType, IAnyStateTreeNode, Instance } from 'mobx-state-tree';
import { action, computed, makeObservable, observableRef } from 'mobx';
import { QueryStore } from './QueryStore';
import type { InfiniteQueryReturnType, MutationScope, QueryReturnType } from './create';

export type RefetchOnWindowFocus<TQuery> =
    | boolean
    | 'always'
    | ((query: TQuery) => boolean | 'always');

export type EndpointType = (
    options: {
        request?: any;
        pagination?: any;
        meta: { [key: string]: any };
        signal: AbortSignal;
        setData: (data: any) => any;
        query: any
    },
) => Promise<any>;

type QueryClientConfig<T extends IAnyModelType> = {
    env?: any;
    queryOptions?: {
        staleTime?: number;
        endpoint?: EndpointType;
        refetchOnWindowFocus?: RefetchOnWindowFocus<Instance<QueryReturnType | InfiniteQueryReturnType>>;
    };
    RootStore: T;
};

const defaultConfig = {
    env: {},
    queryOptions: {
        staleTime: 0,
        cacheTime: 0,
        refetchOnMount: 'if-stale',
        refetchOnChanged: 'all',
        refetchOnWindowFocus: true,
    },
};

export class QueryClient<T extends IAnyModelType> {
    config: QueryClientConfig<T>;
    rootStore!: Instance<T>;
    queryStore!: QueryStore;
    #initialized = false;
    #initialData = {} as any;
    #mutationScopes = new Map<string, Promise<any>>();

    constructor(config: QueryClientConfig<T>) {
        this.config = {
            ...defaultConfig,
            ...config,
            queryOptions: {
                ...defaultConfig.queryOptions,
                ...config.queryOptions,
            },
        };
        makeObservable(this, {
            queryStore: observableRef,
            isMutating: computed,
            init: action,
            reset: action,
        });
    }

    get isMutating() {
        return this.queryStore?.isMutating ?? false;
    }

    init(initialData: any = {}, env = {}) {
        if (this.#initialized) {
            return this;
        }

        this.config.env = env;
        this.config.env.queryClient = this;
        this.queryStore = new QueryStore(this);

        this.rootStore = this.config.RootStore.create(initialData, this.config.env);        

        this.#initialized = true;

        return this;
    }

    reset() {
        destroy(this.rootStore);
        this.queryStore = new QueryStore(this);
        this.rootStore = this.config.RootStore.create(this.#initialData, this.config.env);
    }

    hasPendingMutations(node: IAnyStateTreeNode) {
        return this.queryStore.hasPendingMutations(node);
    }

    getMutationScopes() {
        return this.#mutationScopes;
    }
}
