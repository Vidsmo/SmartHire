import sys
import pytest

if __name__ == '__main__':
    ret = pytest.main(["-q"])  # run tests quietly
    sys.exit(ret)
