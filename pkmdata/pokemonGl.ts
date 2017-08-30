import request = require("request");
import Promise = require("bluebird");

interface Pokemon {
    formName: string;
    formNo: string;
    height: string;
    monsno: number;
    ranking: number;
    sequenceNumber: number;
    typeId1: number;
    typeId2: number;
    typeName1: string;
    typeName2: string;
    weight: string;
    name: string;
}

interface PokemonRanking extends Pokemon {
    battlingChangeFlg: number;
    countBattleByForm: number;
}

export interface Ranking {
    name: string;
    ranking: number;
    sequenceNumber: number;
    usageRate: number;
}

interface MoveRanking extends Ranking {
    name: string;
    ranking: number;
    sequenceName: number;
    typeId: number;
    usageRate: number;
}

interface NatureRanking extends Ranking {
}

interface ItemRanking extends Ranking {
}

interface AbilityRanking extends Ranking {
}

export interface PokemonGlResponse {
    beforePokemonId: string;
    nextPokemonId: string;
    rankingPokemonDown: PokemonRanking[],
    rankingPokemonDownWaza: MoveRanking[],
    rankingPokemonDownWazaOther: MoveRanking,
    rankingPokemonIn: PokemonRanking[],
    rankingPokemonInfo: Pokemon,
    rankingPokemonSufferer: PokemonRanking[],
    rankingPokemonSuffererWaza: MoveRanking[],
    rankingPokemonTrend: {
        itemInfo: ItemRanking[],
        seikakuInfo: NatureRanking[],
        tokuseiInfo: AbilityRanking[],
        wazaInfo: MoveRanking[]
    },
    status_code: string,
    timezoneName: string
}

export function GetGLData(pokemon: string) {
    var deferred = Promise.defer<PokemonGlResponse>();
    request.post("http://3ds.pokemon-gl.com/frontendApi/gbu/getSeasonPokemonDetail", {
        headers: {
            "Origin": "http://3ds.pokemon-gl.com",
            "Referer": "http://3ds.pokemon-gl.com/battle/oras/",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "User-Agent": "CuBoid"
        },
        form: {
            "languageId": "2",
            "seasonId": "108",
            "battleType": "2",
            "timezone": "BST",
            "pokemonId": pokemon,
            "displayNumberWaza": "10",
            "displayNumberTokusei": "3",
            "displayNumberSeikaku": "10",
            "displayNumberItem": "10",
            "displayNumberLevel": "10",
            "displayNumberPokemonIn": "10",
            "displayNumberPokemonDown": "10",
            "displayNumberPokemonDownWaza": "10",
            "timestamp": Date.now().toString()
        }
    }, (err, response, body) => {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(JSON.parse(body));
        }
    });
    return deferred.promise;
}
