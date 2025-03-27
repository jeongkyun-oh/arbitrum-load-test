# Arbitrum Nitro 개발 노드 부하 테스트

이 저장소는 Arbitrum Nitro 개발 노드에 대한 부하 테스트 스크립트와 결과를 포함하고 있습니다.

## 구조

- `load-test-scripts/`: 부하 테스트를 위한 JavaScript 스크립트
  - `config.js`: 테스트 구성 설정
  - `utils.js`: 유틸리티 함수
  - `eth-transfers-test.js`: ETH 전송 테스트
  - `contract-deployment-test.js`: 컨트랙트 배포 테스트
  - `contract-calls-test.js`: 컨트랙트 함수 호출 테스트
  - `mixed-workload-test.js`: 혼합 워크로드 테스트
  - `run-all-tests.js`: 모든 테스트 실행 스크립트
  - `high-gas-load-test.js`: 높은 가스 한도를 사용한 부하 테스트
  - `minimal-test.js`: 최소한의 테스트 스크립트
  - `basic-test.js`: 기본 테스트 스크립트
  - `simple-load-test.js`: 간단한 부하 테스트 스크립트

- `results/`: 테스트 결과 및 보고서
  - `load-test-report.md`: 부하 테스트 결과 보고서
  - `high-gas-load-test-results.txt`: 높은 가스 한도 테스트의 상세 결과

## 테스트 실행 방법

1. Arbitrum Nitro 개발 노드 설정:
   ```bash
   git clone https://github.com/OffchainLabs/nitro-devnode.git
   cd nitro-devnode
   ./run-dev-node.sh
   ```

2. 테스트 스크립트 실행:
   ```bash
   cd load-test-scripts
   npm install
   node high-gas-load-test.js  # 또는 다른 테스트 스크립트
   ```

## 주요 결과

- ETH 전송 및 컨트랙트 배포는 높은 가스 한도(100만 이상)로 성공적으로 수행됨
- 컨트랙트 함수 호출은 실패함 (CALL_EXCEPTION 오류)
- 초당 약 13.13개의 트랜잭션 처리 성능
- 자세한 결과는 `results/load-test-report.md` 파일 참조
